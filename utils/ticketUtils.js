const { ChannelType, PermissionFlagsBits } = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const config = require('../config.json');
const db = require('../database/db.js');
const categories = require('../categories/categories.json');
const { getTicketWelcomeMessage, getTicketCreatedLogMessage, getTicketClosedLogMessage } = require('../messages/ticketPanel.js');
const { uploadToGitHub } = require('./githubUpload.js');

// Create ticket channel (Text Channel in Category)
async function createTicketChannel(interaction, category, formData) {
    const { guild, user } = interaction;

    // Cooldown check
    const cooldownMs = config.ticketCooldown * 1000;
    const cooldownCheck = db.checkUserCooldown(user.id, cooldownMs);

    if (!cooldownCheck.canCreate) {
        const remainingMinutes = Math.ceil(cooldownCheck.remainingMs / 60000);
        return {
            success: false,
            error: `⏰ You need to wait **${remainingMinutes} minutes** before creating a new ticket.`
        };
    }

    try {
        // Get category config
        const categoryConfig = categories[category];

        // Determine which Discord category to use:
        // 1. Category-specific categoryId (from categories.json)
        // 2. Fallback to global ticketCategoryId (from config.json)
        let ticketCategoryId = categoryConfig?.categoryId || config.ticketCategoryId;
        let ticketCategory = null;

        if (ticketCategoryId) {
            try {
                ticketCategory = await guild.channels.fetch(ticketCategoryId);
            } catch (e) {
                console.error('Could not fetch ticket category:', e);
                // Fallback to global category if category-specific one fails
                if (categoryConfig?.categoryId && config.ticketCategoryId) {
                    try {
                        ticketCategory = await guild.channels.fetch(config.ticketCategoryId);
                    } catch (e2) {
                        console.error('Could not fetch fallback ticket category:', e2);
                    }
                }
            }
        }

        // Ticket number
        const ticketNumber = db.getTicketCounter() + 1;

        let ticketName;
        if (config.ticketNaming === 'category-user') {
            const categoryName = categoryConfig?.name || 'ticket';
            // Slugify: lowercase, replace spaces with dashes, remove special chars
            const slugCategory = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const slugUser = user.username.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            ticketName = `${slugCategory}-${slugUser}`;
        } else if (config.ticketNaming === 'number') {
            ticketName = `ticket-${ticketNumber.toString().padStart(4, '0')}`;
        } else {
            ticketName = `ticket-${user.username}`;
        }

        // Build permission overwrites
        const permissionOverwrites = [
            // Deny @everyone from viewing
            {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            // Allow ticket creator
            {
                id: user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.EmbedLinks
                ]
            }
        ];

        // Add support role permission if configured
        if (config.supportRoleId) {
            permissionOverwrites.push({
                id: config.supportRoleId,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.ManageMessages
                ]
            });
        }

        // Create text channel
        const ticketChannel = await guild.channels.create({
            name: ticketName,
            type: ChannelType.GuildText,
            parent: ticketCategory?.id || null,
            permissionOverwrites: permissionOverwrites,
            reason: `Ticket #${ticketNumber} - ${user.tag}`
        });

        // Save to database
        const ticket = db.createTicket(ticketChannel.id, user.id, category, formData, ticketName);

        // Send welcome message
        const welcomeMessage = getTicketWelcomeMessage(ticket, user, category);
        await ticketChannel.send(welcomeMessage);

        // Send to log channel and save message ID
        const logMessageId = await sendTicketCreatedLog(guild, ticket, user);
        if (logMessageId) {
            db.setLogMessageId(ticketChannel.id, logMessageId);
        }

        return {
            success: true,
            ticket: ticket,
            channel: ticketChannel
        };

    } catch (error) {
        console.error('Ticket creation error:', error);
        return {
            success: false,
            error: '❌ An error occurred while creating the ticket: ' + error.message
        };
    }
}

// Send ticket created log and return message ID
async function sendTicketCreatedLog(guild, ticket, user) {
    if (!config.ticketLogChannelId) return null;

    try {
        const logChannel = await guild.channels.fetch(config.ticketLogChannelId);
        if (!logChannel) return null;

        const logMessage = getTicketCreatedLogMessage(ticket, user);
        const sentMessage = await logChannel.send(logMessage);
        return sentMessage.id;
    } catch (error) {
        console.error('Log send error:', error);
        return null;
    }
}

// Close ticket
async function closeTicket(channel, user, rating = null) {
    const ticket = db.getTicket(channel.id);
    if (!ticket) {
        return { success: false, error: '❌ This channel is not a ticket!' };
    }

    try {
        // Get user avatar before closing
        let userAvatar = null;
        try {
            const ticketOwner = await channel.client.users.fetch(ticket.userId);
            userAvatar = ticketOwner.displayAvatarURL({ dynamic: true, size: 256 });
        } catch (e) {
            // User not found, continue without avatar
        }

        // Send closing message
        await channel.send({
            content: `🔒 **Ticket closed** ${user ? `(by <@${user.id}>)` : '(by System)'}\n\n*Generating transcript and uploading to GitHub...*`
        });

        // Generate transcript
        let transcriptUrl = null;
        try {
            // Generate transcript as buffer
            const transcriptBuffer = await discordTranscripts.createTranscript(channel, {
                limit: -1,
                returnType: 'buffer',
                saveImages: true,
                footerText: `Ticket closed by ${user ? user.tag : 'System'} • {number} message{s} saved`,
                poweredBy: false
            });

            // Create filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${ticket.ticketName}-${timestamp}.html`;

            // Upload to GitHub
            const uploadResult = await uploadToGitHub(filename, transcriptBuffer);

            if (uploadResult.success) {
                transcriptUrl = uploadResult.url;
                console.log(`✅ Transcript uploaded to GitHub: ${transcriptUrl}`);
            } else {
                console.error('Failed to upload transcript to GitHub:', uploadResult.error);
            }
        } catch (transcriptError) {
            console.error('Transcript generation error:', transcriptError);
        }

        // Edit the log message with transcript link
        await editTicketClosedLog(channel.guild, ticket, user, {
            rating,
            userAvatar,
            transcriptUrl
        });

        // Remove from database before deleting
        db.closeTicket(channel.id, rating);

        // Delete the channel
        await channel.delete(`Ticket closed by ${user ? user.tag : 'System'}`);

        return { success: true, ticket: ticket };

    } catch (error) {
        console.error('Ticket close error:', error);
        return { success: false, error: '❌ An error occurred while closing the ticket!' };
    }
}

// Edit the log message to show closed status
async function editTicketClosedLog(guild, ticket, closedBy, extra = {}) {
    if (!config.ticketLogChannelId || !ticket.logMessageId) return;

    try {
        const logChannel = await guild.channels.fetch(config.ticketLogChannelId);
        if (!logChannel) return;

        const logMessage = await logChannel.messages.fetch(ticket.logMessageId);
        if (!logMessage) return;

        const closedLogMessage = getTicketClosedLogMessage(ticket, closedBy, extra);
        await logMessage.edit(closedLogMessage);
    } catch (error) {
        console.error('Log edit error:', error);
        // If edit fails, send a new message as fallback
        try {
            const logChannel = await guild.channels.fetch(config.ticketLogChannelId);
            if (logChannel) {
                const closedLogMessage = getTicketClosedLogMessage(ticket, closedBy, extra);
                await logChannel.send(closedLogMessage);
            }
        } catch (e) {
            console.error('Fallback log send error:', e);
        }
    }
}

// Add member to ticket
async function addMemberToTicket(channel, targetUser) {
    const ticket = db.getTicket(channel.id);
    if (!ticket) {
        return { success: false, error: '❌ This channel is not a ticket!' };
    }

    try {
        // Add permission overwrite for the user
        await channel.permissionOverwrites.create(targetUser.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            AttachFiles: true,
            EmbedLinks: true
        });

        await channel.send({
            content: `✅ <@${targetUser.id}> has been added to the ticket.`
        });
        return { success: true };
    } catch (error) {
        console.error('Add member error:', error);
        return { success: false, error: '❌ An error occurred while adding the member!' };
    }
}

// Remove member from ticket
async function removeMemberFromTicket(channel, targetUser, ticket) {
    console.log(`[DEBUG] Attempting to remove user ${targetUser.id} from ticket ${channel.id}`);

    if (!ticket) {
        ticket = db.getTicket(channel.id);
    }
    if (!ticket) {
        return { success: false, error: '❌ This channel is not a ticket!' };
    }

    // Ticket owner cannot be removed
    if (targetUser.id === ticket.userId) {
        return { success: false, error: '❌ The ticket owner cannot be removed!' };
    }

    try {
        // Check if user has a permission overwrite on this channel
        const overwrite = channel.permissionOverwrites.cache.get(targetUser.id);

        if (!overwrite) {
            return { success: false, error: '❌ User is not in this ticket!' };
        }

        // Check if user has admin permissions (they'd still see the channel)
        try {
            const guildMember = await channel.guild.members.fetch(targetUser.id);
            if (guildMember.permissions.has('Administrator')) {
                return {
                    success: false,
                    error: '⚠️ This user has **Administrator** permission and will still be able to see this channel even if removed.'
                };
            }
        } catch (e) {
            console.log(`[DEBUG] Could not fetch guild member for permission check: ${e.message}`);
        }

        // Remove the permission overwrite
        await channel.permissionOverwrites.delete(targetUser.id);

        await channel.send({
            content: `➖ <@${targetUser.id}> has been removed from the ticket.`
        });
        return { success: true };

    } catch (error) {
        console.error('[DEBUG] Remove member error:', error);
        return { success: false, error: `❌ An error occurred: ${error.message}` };
    }
}

// Rename ticket
async function renameTicket(channel, newName) {
    const ticket = db.getTicket(channel.id);
    if (!ticket) {
        return { success: false, error: '❌ This channel is not a ticket!' };
    }

    try {
        await channel.setName(newName);
        return { success: true };
    } catch (error) {
        return { success: false, error: '❌ An error occurred while renaming the ticket!' };
    }
}

module.exports = {
    createTicketChannel,
    closeTicket,
    addMemberToTicket,
    removeMemberFromTicket,
    sendTicketCreatedLog,
    editTicketClosedLog,
    renameTicket
};
