const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();
const connectToDatabase = require('./database/connect.js');
const { Client, Collection, Events, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const config = require('./config.json');
const { handleButton, handleSelectMenu } = require('./handlers/buttonHandler.js');
const registerAutomodHandler = require('./handlers/automodHandler.js');
const { startTimeoutChecker } = require('./utils/timeoutChecker.js');
const { createTicketChannel } = require('./utils/ticketUtils.js');
const db = require('./database/db.js');
const categories = require('./categories/categories.json');

// Message management
const { manageMessage, updateMessageInfo, generateContentHash } = require('./database/messageDb.js');
const { getTicketPanelMessage } = require('./messages/ticketPanel.js');
const homeMessage = require('./messages/home.js');
const partnerMessage = require('./messages/partner.js');
const termsMessage = require('./messages/terms.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Command loaded: ${command.data.name}`);
        }
    }
}

// Bot ready event
client.once(Events.ClientReady, async readyClient => {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║     🎫 Speaw Ticket Bot v1.0.0         ║`);
    console.log(`╠════════════════════════════════════════╣`);
    console.log(`║  Bot: ${readyClient.user.tag.padEnd(30)}   ║`);
    console.log(`║  Commands: ${client.commands.size.toString().padEnd(27)} ║`);
    console.log(`║  Guilds: ${client.guilds.cache.size.toString().padEnd(29)} ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    // Start timeout checker
    startTimeoutChecker(client);

    // Register automod handler
    registerAutomodHandler(client);

    // Restore active giveaways on restart
    try {
        const giveawayDb = require('./database/giveawayDb');
        const giveawayCommand = require('./commands/giveaway');
        const activeGiveaways = giveawayDb.getAllActiveGiveaways();

        if (activeGiveaways.length > 0) {
            console.log(`🎉 Restoring ${activeGiveaways.length} active giveaway(s)...`);
            for (const giveaway of activeGiveaways) {
                giveawayCommand.scheduleGiveawayEnd(client, giveaway, giveaway.guildId);
            }
            console.log(`✅ Giveaway timers restored.`);
        }
    } catch (error) {
        console.error('❌ Giveaway restoration error:', error.message);
    }

    // Connect to MongoDB
    connectToDatabase();

    // Smart Ticket Panel Management
    if (config.ticketPanelChannelId && config.ticketPanelChannelId !== "TICKET_PANEL_CHANNEL_ID") {
        try {
            const panelMessage = getTicketPanelMessage();
            const decision = await manageMessage(client, 'ticketPanel', config.ticketPanelChannelId, panelMessage);

            if (decision.action === 'send' || decision.action === 'update') {
                const panelChannel = await client.channels.fetch(config.ticketPanelChannelId);
                if (panelChannel) {
                    const sentMessage = await panelChannel.send(panelMessage);
                    const contentHash = generateContentHash(panelMessage);
                    updateMessageInfo('ticketPanel', config.ticketPanelChannelId, sentMessage.id, contentHash);
                    console.log(`🎫 Ticket panel sent: ${decision.reason}`);
                }
            }
        } catch (error) {
            console.error('❌ Ticket panel error:', error);
        }
    } else {
        console.log('⚠️ Ticket panel channel not configured - update ticketPanelChannelId in config.json');
    }

    // Smart Home Message Management
    if (config.homeChannelId && config.homeChannelId !== "HOME_CHANNEL_ID") {
        try {
            const decision = await manageMessage(client, 'home', config.homeChannelId, homeMessage);

            if (decision.action === 'send' || decision.action === 'update') {
                const homeChannel = await client.channels.fetch(config.homeChannelId);
                if (homeChannel) {
                    const sentMessage = await homeChannel.send(homeMessage);
                    const contentHash = generateContentHash(homeMessage);
                    updateMessageInfo('home', config.homeChannelId, sentMessage.id, contentHash);
                    console.log(`🏠 Home message sent: ${decision.reason}`);
                }
            }
        } catch (error) {
            console.error('❌ Home message error:', error);
        }
    } else {
        console.log('⚠️ Home channel not configured - update homeChannelId in config.json');
    }

    // Smart Partner Message Management
    if (config.partnerChannelId && config.partnerChannelId !== "PARTNER_CHANNEL_ID") {
        try {
            const decision = await manageMessage(client, 'partner', config.partnerChannelId, partnerMessage);

            if (decision.action === 'send' || decision.action === 'update') {
                const partnerChannel = await client.channels.fetch(config.partnerChannelId);
                if (partnerChannel) {
                    const sentMessage = await partnerChannel.send(partnerMessage);
                    const contentHash = generateContentHash(partnerMessage);
                    updateMessageInfo('partner', config.partnerChannelId, sentMessage.id, contentHash);
                    console.log(`🤝 Partner message sent: ${decision.reason}`);
                }
            }
        } catch (error) {
            console.error('❌ Partner message error:', error);
        }
    } else {
        console.log('⚠️ Partner channel not configured - update partnerChannelId in config.json');
    }

    // Smart Terms Message Management
    if (config.termsChannelId && config.termsChannelId !== "TERMS_CHANNEL_ID") {
        try {
            const decision = await manageMessage(client, 'terms', config.termsChannelId, termsMessage);

            if (decision.action === 'send' || decision.action === 'update') {
                const termsChannel = await client.channels.fetch(config.termsChannelId);
                if (termsChannel) {
                    const sentMessage = await termsChannel.send(termsMessage);
                    const contentHash = generateContentHash(termsMessage);
                    updateMessageInfo('terms', config.termsChannelId, sentMessage.id, contentHash);
                    console.log(`📜 Terms message sent: ${decision.reason}`);
                }
            }
        } catch (error) {
            console.error('❌ Terms message error:', error);
        }
    } else {
        console.log('⚠️ Terms channel not configured - update termsChannelId in config.json');
    }

    // Bot status
    const { ActivityType, PresenceUpdateStatus } = require('discord.js');
    const stats = db.getStats();


    let currentIndex = 0;

    // Status messages
    const statusMessages = [
        "Managing 5K+ Members",
        "Watching UnderFive Studios",
        "Managing Tickets"
    ];

    // Initial status
    await client.user.setPresence({
        activities: [{
            name: statusMessages[0],
            type: ActivityType.Custom,
            state: statusMessages[0]
        }],
        status: PresenceUpdateStatus.Online
    });

    // Change status every 30 seconds
    setInterval(async () => {
        currentIndex = (currentIndex + 1) % statusMessages.length;

        try {
            await client.user.setPresence({
                activities: [{
                    name: statusMessages[currentIndex],
                    type: ActivityType.Custom,
                    state: statusMessages[currentIndex]
                }],
                status: PresenceUpdateStatus.Online
            });
        } catch (error) {
            console.error('Status update error:', error);
        }
    }, 30000);
});

// Interaction handler
client.on(Events.InteractionCreate, async interaction => {
    // Slash commands
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`❌ Command not found: ${interaction.commandName}`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Command error:', error);
            const reply = { content: '❌ An error occurred while executing this command!', flags: 64 };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    }

    // Button interactions
    if (interaction.isButton()) {
        await handleButton(interaction);
    }

    // String Select Menu interactions
    if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction);
    }

    // User Select Menu interactions
    if (interaction.isUserSelectMenu()) {
        await handleSelectMenu(interaction);
    }

    // Channel Select Menu interactions
    if (interaction.isChannelSelectMenu()) {
        await handleSelectMenu(interaction);
    }

    // Role Select Menu interactions
    if (interaction.isRoleSelectMenu()) {
        await handleSelectMenu(interaction);
    }

    // Modal submissions
    if (interaction.isModalSubmit()) {
        // ticket_modal_general, ticket_modal_technical etc.
        if (interaction.customId.startsWith('ticket_modal_')) {
            const category = interaction.customId.replace('ticket_modal_', '');
            const categoryConfig = categories[category];

            if (!categoryConfig) {
                return await interaction.reply({
                    content: '❌ Invalid category!',
                    flags: 64
                });
            }

            // Collect form data
            const formData = {};
            for (const field of categoryConfig.modalFields) {
                try {
                    formData[field.id] = interaction.fields.getTextInputValue(field.id);
                } catch (e) {
                    formData[field.id] = '';
                }
            }

            await interaction.deferReply({ flags: 64 });

            // Create ticket
            const result = await createTicketChannel(interaction, category, formData);

            if (result.success) {
                await interaction.editReply({
                    content: `✅ **Ticket created successfully!**\n\n📍 Ticket channel: <#${result.channel.id}>\n🔢 Ticket number: #${result.ticket.ticketNumber}`
                });
            } else {
                await interaction.editReply({
                    content: result.error
                });
            }
        }

        // Ban confirmation modal
        if (interaction.customId.startsWith('ban_confirm_')) {
            const userId = interaction.customId.replace('ban_confirm_', '');
            const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided';

            await interaction.deferReply({ flags: 64 });

            try {
                await interaction.guild.members.ban(userId, { reason: `${reason} | By: ${interaction.user.tag}` });
                await interaction.editReply({
                    content: `✅ **User banned successfully!**\n> User ID: \`${userId}\`\n> Reason: ${reason}`
                });
            } catch (error) {
                await interaction.editReply({
                    content: `❌ **Failed to ban user!**\n> ${error.message}`
                });
            }
        }

        // Kick confirmation modal
        if (interaction.customId.startsWith('kick_confirm_')) {
            const userId = interaction.customId.replace('kick_confirm_', '');
            const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided';

            await interaction.deferReply({ flags: 64 });

            try {
                const member = await interaction.guild.members.fetch(userId);
                await member.kick(`${reason} | By: ${interaction.user.tag}`);
                await interaction.editReply({
                    content: `✅ **User kicked successfully!**\n> User ID: \`${userId}\`\n> Reason: ${reason}`
                });
            } catch (error) {
                await interaction.editReply({
                    content: `❌ **Failed to kick user!**\n> ${error.message}`
                });
            }
        }

        // Timeout confirmation modal
        if (interaction.customId.startsWith('timeout_confirm_')) {
            const userId = interaction.customId.replace('timeout_confirm_', '');
            const durationStr = interaction.fields.getTextInputValue('duration');
            const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided';
            const duration = parseInt(durationStr);

            if (isNaN(duration) || duration <= 0) {
                return await interaction.reply({
                    content: '❌ **Invalid duration!** Please enter a valid number of minutes.',
                    flags: 64
                });
            }

            await interaction.deferReply({ flags: 64 });

            try {
                const member = await interaction.guild.members.fetch(userId);
                await member.timeout(duration * 60 * 1000, `${reason} | By: ${interaction.user.tag}`);
                await interaction.editReply({
                    content: `✅ **User timed out successfully!**\n> User ID: \`${userId}\`\n> Duration: ${duration} minutes\n> Reason: ${reason}`
                });
            } catch (error) {
                await interaction.editReply({
                    content: `❌ **Failed to timeout user!**\n> ${error.message}`
                });
            }
        }

        // Automod bad words add modal
        if (interaction.customId === 'automod_words_add_modal') {
            const { getAutomodConfig, saveAutomodConfig } = require('./database/automodDb.js');
            const { buildWordsPage } = require('./utils/automodUtils.js');

            const wordsInput = interaction.fields.getTextInputValue('words');
            const newWords = wordsInput.split('\n').map(w => w.trim()).filter(w => w.length > 0);

            const config = getAutomodConfig(interaction.guildId);
            if (!config.modules.badwords) {
                config.modules.badwords = { enabled: false, punishments: ['delete'], words: [], ignore: { channels: [], roles: [] } };
            }

            // Add new words (avoid duplicates)
            const existingWords = new Set(config.modules.badwords.words.map(w => w.toLowerCase()));
            for (const word of newWords) {
                if (!existingWords.has(word.toLowerCase())) {
                    config.modules.badwords.words.push(word);
                }
            }

            saveAutomodConfig(interaction.guildId, config);

            const container = buildWordsPage(config);
            return interaction.update({ components: [container] });
        }

        // Automod bad words bulk remove modal
        if (interaction.customId === 'automod_words_bulk_remove_modal') {
            const { getAutomodConfig, saveAutomodConfig } = require('./database/automodDb.js');
            const { buildWordsPage } = require('./utils/automodUtils.js');

            const wordsInput = interaction.fields.getTextInputValue('words');
            const wordsToRemove = wordsInput.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);

            const config = getAutomodConfig(interaction.guildId);
            if (config.modules.badwords?.words) {
                config.modules.badwords.words = config.modules.badwords.words.filter(
                    w => !wordsToRemove.includes(w.toLowerCase())
                );
            }

            saveAutomodConfig(interaction.guildId, config);

            const container = buildWordsPage(config);
            return interaction.update({ components: [container] });
        }

        // Automod strike expiry modal
        if (interaction.customId === 'automod_strike_expiry_modal') {
            const { getAutomodConfig, saveAutomodConfig } = require('./database/automodDb.js');
            const { buildStrikesPage } = require('./utils/automodUtils.js');

            const hoursInput = interaction.fields.getTextInputValue('hours');
            const hours = parseInt(hoursInput);

            if (isNaN(hours) || hours <= 0) {
                return interaction.reply({
                    content: '❌ Invalid hours. Please enter a positive number.',
                    flags: 64
                });
            }

            const config = getAutomodConfig(interaction.guildId);
            config.strikeExpiry = hours;
            saveAutomodConfig(interaction.guildId, config);

            const container = buildStrikesPage(config);
            return interaction.update({ components: [container] });
        }

        // Automod strike action modal
        if (interaction.customId.startsWith('automod_strike_action_modal_')) {
            const { getAutomodConfig, saveAutomodConfig } = require('./database/automodDb.js');
            const { buildStrikesPage } = require('./utils/automodUtils.js');

            const threshold = interaction.customId.replace('automod_strike_action_modal_', '');
            const action = interaction.fields.getTextInputValue('action').toLowerCase().trim();
            const duration = interaction.fields.getTextInputValue('duration')?.trim() || '';

            const validActions = ['mute', 'kick', 'ban', 'clear'];
            if (!validActions.includes(action)) {
                return interaction.reply({
                    content: '❌ Invalid action. Use: mute, kick, ban, or clear',
                    flags: 64
                });
            }

            const config = getAutomodConfig(interaction.guildId);
            if (!config.strikeActions) {
                config.strikeActions = {};
            }

            if (action === 'clear') {
                delete config.strikeActions[threshold];
            } else {
                config.strikeActions[threshold] = { action };
                if (action === 'mute' && duration) {
                    config.strikeActions[threshold].duration = duration;
                }
            }

            saveAutomodConfig(interaction.guildId, config);

            const container = buildStrikesPage(config);
            return interaction.update({ components: [container] });
        }
        // Embed Builder Modals
        if (interaction.customId.startsWith('embed_modal_')) {
            const embedDb = require('./database/embedDb');
            const { buildEmbedBuilderUI, parseEmbedCode } = require('./utils/embedUtils');

            const parts = interaction.customId.split('_'); // embed, modal, action, userId
            const action = parts[2];
            const userId = parts[3];

            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '❌ You cannot edit this session.', ephemeral: true });
            }

            let draft = embedDb.getDraft(userId);

            if (action === 'field') {
                const name = interaction.fields.getTextInputValue('name');
                const value = interaction.fields.getTextInputValue('value');
                const inline = interaction.fields.getTextInputValue('inline')?.toLowerCase() === 'true';

                draft.fields.push({ name, value, inline });
            } else if (action === 'code') {
                const code = interaction.fields.getTextInputValue('input');
                const context = { user: interaction.user, guild: interaction.guild, channel: interaction.channel };
                const parsed = parseEmbedCode(code, context);

                // Replace draft with parsed code
                draft = parsed;
            } else {
                const value = interaction.fields.getTextInputValue('input');

                if (action === 'title') draft.title = value;
                if (action === 'desc') draft.description = value;
                if (action === 'color') draft.color = value.startsWith('#') ? parseInt(value.slice(1), 16) : parseInt(value, 16);
                if (action === 'url') draft.url = value;
                if (action === 'image') draft.image = value;
                if (action === 'thumb') draft.thumbnail = value;

                if (action === 'author') {
                    const [name, iconURL, url] = value.split('&&').map(s => s.trim());
                    draft.author = { name: name || null, iconURL: iconURL || null, url: url || null };
                }

                if (action === 'footer') {
                    const [text, iconURL] = value.split('&&').map(s => s.trim());
                    draft.footer = { text: text || null, iconURL: iconURL || null };
                }
            }

            embedDb.saveDraft(userId, draft);
            const container = buildEmbedBuilderUI(userId, draft);
            const data = container.toJSON();
            await interaction.update({ embeds: data.embeds, components: data.components });
            return;
        }
    }
});

// Message activity tracking
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    // Update activity if message is in ticket channel
    const ticket = db.getTicket(message.channel.id);
    if (ticket) {
        db.updateLastActivity(message.channel.id);
    }
});

// Member Join Event - Components V3
const leaveDb = require('./database/leaveDb.js');

client.on(Events.GuildMemberAdd, async member => {
    if (!config.memberLogChannelId || config.memberLogChannelId === "MEMBER_LOG_CHANNEL_ID") return;

    try {
        const logChannel = await client.channels.fetch(config.memberLogChannelId);
        if (!logChannel) return;

        const joinMessage = {
            flags: 32768, // IS_COMPONENTS_V2
            components: [
                {
                    type: 17, // Container
                    components: [
                        {
                            type: 9, // Section
                            components: [
                                {
                                    type: 10, // Text Display
                                    content: `## 🎉 Welcome to the Server!\n\n**${member.user.tag}** has joined our community\n\n> 🎭 **Member Details**\n> 🔑 **User ID:** \`${member.user.id}\`\n> 📅 **Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n> 👥 **Total Members:** ${member.guild.memberCount.toLocaleString()}\n\n🛡️ **Moderation Panel** - Quick actions available`
                                }
                            ],
                            accessory: {
                                type: 11, // Thumbnail 
                                media: {
                                    url: member.user.displayAvatarURL({ dynamic: true, size: 256 })
                                }
                            }
                        },
                        {
                            type: 1, // Action Row
                            components: [
                                {
                                    type: 2, // Button
                                    custom_id: `ban_${member.user.id}`,
                                    label: 'Ban User',
                                    style: 4, // Danger
                                    emoji: { name: '🔨' }
                                },
                                {
                                    type: 2, // Button
                                    custom_id: `kick_${member.user.id}`,
                                    label: 'Kick User',
                                    style: 2, // Secondary
                                    emoji: { name: '👢' }
                                },
                                {
                                    type: 2, // Button
                                    custom_id: `timeout_${member.user.id}`,
                                    label: 'Timeout',
                                    style: 2, // Secondary
                                    emoji: { name: '⏰' }
                                },
                                {
                                    type: 2, // Button
                                    custom_id: `userinfo_${member.user.id}`,
                                    label: 'User Info',
                                    style: 1, // Primary
                                    emoji: { name: 'ℹ️' }
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        await logChannel.send(joinMessage);
        console.log(`✅ ${member.user.tag} joined - log sent`);

    } catch (error) {
        console.error('❌ Member join log error:', error);
    }
});

// Member Leave Event - Components V3
client.on(Events.GuildMemberRemove, async member => {
    if (!config.memberLogChannelId || config.memberLogChannelId === "MEMBER_LOG_CHANNEL_ID") return;

    try {
        const logChannel = await client.channels.fetch(config.memberLogChannelId);
        if (!logChannel) return;

        // Track leave count
        const leaveCount = leaveDb.incrementLeaveCount(member.user.id);

        const leaveMessage = {
            flags: 32768, // IS_COMPONENTS_V2
            components: [
                {
                    type: 17, // Container
                    components: [
                        {
                            type: 9, // Section
                            components: [
                                {
                                    type: 10, // Text Display
                                    content: `## 👋 Goodbye!\n\n**${member.user.tag}** has left our community\n\n> 💔 **Member Details**\n> 🔑 **User ID:** \`${member.user.id}\`\n> 📅 **Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n> 👥 **Remaining Members:** ${member.guild.memberCount.toLocaleString()}\n> 🚪 **Leave Count:** ${leaveCount}. time\n\n🚫 **Post-Leave Actions** - Limited options available`
                                }
                            ],
                            accessory: {
                                type: 11, // Thumbnail
                                media: {
                                    url: member.user.displayAvatarURL({ dynamic: true, size: 256 })
                                }
                            }
                        },
                        {
                            type: 1, // Action Row
                            components: [
                                {
                                    type: 2, // Button
                                    custom_id: `ban_${member.user.id}`,
                                    label: 'Ban User',
                                    style: 4, // Danger
                                    emoji: { name: '🔨' }
                                },
                                {
                                    type: 2, // Button
                                    custom_id: `userinfo_${member.user.id}`,
                                    label: 'User Info',
                                    style: 1, // Primary
                                    emoji: { name: 'ℹ️' }
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        await logChannel.send(leaveMessage);
        console.log(`👋 ${member.user.tag} left (${leaveCount}. time) - log sent`);

    } catch (error) {
        console.error('❌ Member leave log error:', error);
    }
});

// Login
client.login(config.token);
