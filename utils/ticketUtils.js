const { ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');
const db = require('../database/db.js');
const categories = require('../categories/categories.json');
const { getTicketWelcomeMessage, getTicketCreatedLogMessage, getTicketClosedLogMessage } = require('../messages/ticketPanel.js');

// Create ticket channel (Private Thread)
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
        // Get ticket panel channel
        const parentChannel = await guild.channels.fetch(config.ticketPanelChannelId);
        if (!parentChannel) {
            return { success: false, error: '❌ Ticket panel channel not found!' };
        }

        // Ticket number
        const ticketNumber = db.getTicketCounter() + 1;

        let ticketName;
        if (config.ticketNaming === 'category-user') {
            const categoryName = categories[category]?.name || 'ticket';
            // Slugify: lowercase, replace spaces with dashes, remove special chars
            const slugCategory = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const slugUser = user.username.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            ticketName = `${slugCategory}-${slugUser}`;
        } else if (config.ticketNaming === 'number') {
            ticketName = `ticket-${ticketNumber.toString().padStart(4, '0')}`;
        } else {
            ticketName = `ticket-${user.username}`;
        }

        // Create Private Thread
        const thread = await parentChannel.threads.create({
            name: ticketName,
            type: ChannelType.PrivateThread,
            reason: `Ticket #${ticketNumber} - ${user.tag}`
        });

        // Add user
        await thread.members.add(user.id);

        // Add support role members
        if (config.supportRoleId) {
            try {
                const supportRole = await guild.roles.fetch(config.supportRoleId);
                if (supportRole) {
                    for (const [memberId] of supportRole.members) {
                        await thread.members.add(memberId).catch(() => { });
                    }
                }
            } catch (e) {
                console.error('Error adding support role:', e);
            }
        }

        // Save to database
        const ticket = db.createTicket(thread.id, user.id, category, formData, ticketName);

        // Send welcome message
        const welcomeMessage = getTicketWelcomeMessage(ticket, user, category);
        await thread.send(welcomeMessage);

        // Send to log channel and save message ID
        const logMessageId = await sendTicketCreatedLog(guild, ticket, user);
        if (logMessageId) {
            db.setLogMessageId(thread.id, logMessageId);
        }

        return {
            success: true,
            ticket: ticket,
            channel: thread
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

        // Send final message
        await channel.send({
            content: `🔒 **Ticket closed** ${user ? `(by <@${user.id}>)` : '(by System)'}`
        });

        // Archive and lock thread
        await channel.setLocked(true);
        await channel.setArchived(true);

        // Get thread URL
        const threadUrl = `https://discord.com/channels/${channel.guild.id}/${channel.id}`;

        // Edit the log message
        await editTicketClosedLog(channel.guild, ticket, user, {
            rating,
            threadUrl,
            userAvatar
        });

        // Remove from database after logging
        db.closeTicket(channel.id, rating);

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
        await channel.members.add(targetUser.id);
        await channel.send({
            content: `✅ <@${targetUser.id}> has been added to the ticket.`
        });
        return { success: true };
    } catch (error) {
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
        // Log before fetch
        console.log(`[DEBUG] Fetching thread member...`);

        // 1. Check if user is actually in the thread
        try {
            await channel.members.fetch(targetUser.id);
        } catch (e) {
            console.log(`[DEBUG] User not found in thread: ${e.message}`);
            return { success: false, error: '❌ User is not in this ticket!' };
        }

        // 2. Check if user has high permissions (Manage Threads/Admin)
        // Need to check BOTH guild-level AND channel-level permissions
        // because users with Manage Threads can ALWAYS see private threads
        try {
            const guildMember = await channel.guild.members.fetch(targetUser.id);
            
            // Check guild-level permissions
            const hasGuildPerms = guildMember.permissions.has('ManageThreads') || 
                                  guildMember.permissions.has('Administrator');
            
            // Check channel-level permissions (this includes permission overrides)
            const parentChannel = channel.parent;
            const hasChannelPerms = parentChannel ? 
                parentChannel.permissionsFor(guildMember).has('ManageThreads') : false;
            
            if (hasGuildPerms || hasChannelPerms) {
                console.log(`[DEBUG] User has Manage Threads or Admin permission - cannot be removed`);
                return {
                    success: false,
                    error: '⚠️ This user has **Staff Permissions** (Manage Threads or Admin) and will still be able to see this private thread even if removed from the member list.\n\nUsers with Manage Threads permission can always view all private threads.'
                };
            }
        } catch (e) {
            console.log(`[DEBUG] Could not fetch guild member for permission check: ${e.message}`);
            // Continue removal anyway
        }

        // 3. Remove using raw REST API (fixes discord.js bug where removal message shows but user stays)
        console.log(`[DEBUG] Removing member using REST API...`);
        await channel.client.rest.delete(`/channels/${channel.id}/thread-members/${targetUser.id}`);

        // 4. Verify removal (Optional, but good for debugging)
        console.log(`[DEBUG] Verifying removal...`);
        try {
            // Wait a moment for Discord's API to process
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const stillMember = await channel.members.fetch(targetUser.id).catch(() => null);
            if (stillMember) {
                console.log(`[DEBUG] WARNING: User still found in thread after removal!`);
                return { success: false, error: '❌ Failed to remove user (Unknown API error).' };
            } else {
                console.log(`[DEBUG] SUCCESS: User successfully removed from thread!`);
            }
        } catch (e) {
            console.log(`[DEBUG] Verification check passed (user not found in thread)`);
        }

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
