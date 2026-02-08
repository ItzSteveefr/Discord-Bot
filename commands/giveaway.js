const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    MessageFlags,
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder
} = require('discord.js');
const giveawayDb = require('../database/giveawayDb');

const SAFE_MENTIONS = { parse: [] };
const getFooterText = () => `**UnderFive Studios** | <t:${Math.floor(Date.now() / 1000)}:R>`;

// ============== UTILITY FUNCTIONS ==============

function parseDuration(str) {
    if (!str || typeof str !== 'string') return null;
    const regex = /(\d+)\s*(d|h|m|s)/gi;
    let totalMs = 0;
    let match;
    while ((match = regex.exec(str)) !== null) {
        const val = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        if (unit === 'd') totalMs += val * 86400000;
        else if (unit === 'h') totalMs += val * 3600000;
        else if (unit === 'm') totalMs += val * 60000;
        else if (unit === 's') totalMs += val * 1000;
    }
    return totalMs > 0 ? totalMs : null;
}

function formatTimestamp(ms) {
    return `<t:${Math.floor(ms / 1000)}:R>`;
}

function formatFullTimestamp(ms) {
    return `<t:${Math.floor(ms / 1000)}:F>`;
}

function parseMessageIdentifier(value) {
    if (!value) return null;
    const linkMatch = value.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
    if (linkMatch) {
        return { guildId: linkMatch[1], channelId: linkMatch[2], messageId: linkMatch[3] };
    }
    const idMatch = value.match(/^\d{10,}$/);
    if (idMatch) {
        return { messageId: value };
    }
    return null;
}

function pickWinners(entries, count) {
    if (!entries || entries.length === 0) return [];
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ============== UI BUILDERS ==============

function buildResponseContainer(content, color = null) {
    const container = new ContainerBuilder();
    if (color) container.setAccentColor(color);
    container.addTextDisplayComponents(td => td.setContent(content));
    container.addTextDisplayComponents(td => td.setContent(`-# ${getFooterText()}`));
    return container;
}

function buildGiveawayContainer(giveaway, ended = false) {
    giveaway.entries = giveaway.entries || [];
    giveaway.winners = giveaway.winners || [];
    giveaway.giveawayId = giveaway.giveawayId || giveaway.messageId;

    const container = new ContainerBuilder();
    if (giveaway.color) {
        container.setAccentColor(giveaway.color);
    }

    const titleEmoji = '🎉';
    container.addTextDisplayComponents(td => td.setContent(`# ${titleEmoji} ${giveaway.prize}`));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    if (giveaway.description) {
        container.addTextDisplayComponents(td => td.setContent(giveaway.description));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    }

    const arrow = '➡️';
    let infoText = '';

    if (ended) {
        const winners = giveaway.winners?.length > 0
            ? giveaway.winners.map(id => `<@${id}>`).join(', ')
            : 'No valid winners';
        infoText = `${arrow} **Winners:** ${winners}\n`;
        infoText += `${arrow} **Entries:** ${giveaway.entries?.length || 0}\n`;
        infoText += `${arrow} **Ended:** ${formatFullTimestamp(giveaway.endTime)}`;
    } else {
        infoText = `${arrow} **Ends:** ${formatTimestamp(giveaway.endTime)}\n`;
        infoText += `${arrow} **Winners:** ${giveaway.winnerCount}\n`;
        if (giveaway.winnerRoles?.length > 0) {
            infoText += `${arrow} **Prize Roles:** ${giveaway.winnerRoles.map(r => `<@&${r}>`).join(', ')}\n`;
        }
        infoText += `${arrow} **Entries:** ${giveaway.entries?.length || 0}\n`;
        infoText += `${arrow} **Hosted by:** <@${giveaway.hostId}>`;
    }

    if (giveaway.thumbnail) {
        container.addSectionComponents(section => {
            section.addTextDisplayComponents(td => td.setContent(infoText));
            section.setThumbnailAccessory(thumb => thumb.setURL(giveaway.thumbnail));
            return section;
        });
    } else {
        container.addTextDisplayComponents(td => td.setContent(infoText));
    }

    // Requirements section
    const requirements = [];
    if (giveaway.requiredRoles?.length > 0) {
        requirements.push(`**Required Roles:** ${giveaway.requiredRoles.map(r => `<@&${r}>`).join(', ')}`);
    }
    if (giveaway.minLevel > 0) {
        requirements.push(`**Min Level:** ${giveaway.minLevel}`);
    }
    if (giveaway.maxLevel > 0) {
        requirements.push(`**Max Level:** ${giveaway.maxLevel}`);
    }
    if (giveaway.minAge > 0) {
        requirements.push(`**Min Account Age:** ${giveaway.minAge} days`);
    }
    if (giveaway.minStay > 0) {
        requirements.push(`**Min Server Stay:** ${giveaway.minStay} days`);
    }

    if (requirements.length > 0) {
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(`### Requirements\n${requirements.join('\n')}`));
    }

    // Image gallery
    if (giveaway.image) {
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        const gallery = new MediaGalleryBuilder().addItems(item => item.setURL(giveaway.image));
        container.addMediaGalleryComponents(gallery);
    }

    // Buttons (only for active giveaways)
    if (!ended) {
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

        const joinRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`giveaway_join:${giveaway.giveawayId}`)
                .setEmoji('🎉')
                .setLabel(`Enter (${giveaway.entries?.length || 0})`)
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`giveaway_view:${giveaway.giveawayId}`)
                .setEmoji('👥')
                .setLabel('View Participants')
                .setStyle(ButtonStyle.Secondary)
        );
        container.addActionRowComponents(joinRow);
    }

    // Footer
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(`-# ${getFooterText()}`));

    return container;
}

// ============== REQUIREMENT CHECKING ==============

async function checkRequirements(member, giveaway) {
    const errors = [];

    // Required roles check
    if (giveaway.requiredRoles?.length > 0) {
        const hasRole = giveaway.requiredRoles.some(roleId => member.roles.cache.has(roleId));
        if (!hasRole) {
            errors.push('You need one of the required roles to enter.');
        }
    }

    // Level check (placeholder - always passes since no leveling system)
    if (giveaway.minLevel > 0 || giveaway.maxLevel > 0) {
        const userLevel = 0; // No leveling system in UnderFive yet
        if (giveaway.minLevel > 0 && userLevel < giveaway.minLevel) {
            errors.push(`You need to be at least level ${giveaway.minLevel} to enter.`);
        }
        if (giveaway.maxLevel > 0 && userLevel > giveaway.maxLevel) {
            errors.push(`You cannot be higher than level ${giveaway.maxLevel} to enter.`);
        }
    }

    // Account age check
    if (giveaway.minAge > 0) {
        const accountAge = (Date.now() - member.user.createdTimestamp) / 86400000;
        if (accountAge < giveaway.minAge) {
            errors.push(`Your account must be at least ${giveaway.minAge} days old.`);
        }
    }

    // Server stay check
    if (giveaway.minStay > 0) {
        const stayDays = (Date.now() - member.joinedTimestamp) / 86400000;
        if (stayDays < giveaway.minStay) {
            errors.push(`You must be in the server for at least ${giveaway.minStay} days.`);
        }
    }

    return errors;
}

// ============== WINNER ROLE ASSIGNMENT ==============

async function awardWinnerRoles(guild, giveaway) {
    if (!giveaway.winnerRoles?.length || !giveaway.winners?.length) return;

    for (const winnerId of giveaway.winners) {
        try {
            const member = await guild.members.fetch(winnerId).catch(() => null);
            if (member) {
                for (const roleId of giveaway.winnerRoles) {
                    await member.roles.add(roleId).catch(() => { });
                }
            }
        } catch { }
    }
}

// ============== END GIVEAWAY LOGIC ==============

async function endGiveawayLogic(client, giveaway, guildId) {
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return null;

    const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel) return null;

    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (!message) return null;

    // Validate entries
    const validEntries = [];
    for (const userId of giveaway.entries || []) {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
            const errors = await checkRequirements(member, giveaway);
            if (errors.length === 0) validEntries.push(userId);
        }
    }

    const winners = pickWinners(validEntries, giveaway.winnerCount);
    giveaway.winners = winners;
    giveaway.ended = true;

    // Update message with Components v2
    const container = buildGiveawayContainer(giveaway, true);
    await message.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: SAFE_MENTIONS
    }).catch(() => { });

    // Award roles
    await awardWinnerRoles(guild, giveaway);

    // Save to database
    giveawayDb.updateGiveaway(guildId, giveaway);

    // Announce winners
    if (winners.length > 0) {
        const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
        const winContainer = buildResponseContainer(`# 🎊 Congratulations!\n${winnerMentions} won **${giveaway.prize}**!`);
        await channel.send({
            components: [winContainer],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: { users: winners }
        }).catch(() => { });
    } else {
        const noWinContainer = buildResponseContainer(`# 😢 No Winners\nNo valid entries for **${giveaway.prize}**. The giveaway ended with no winners.`);
        await channel.send({
            components: [noWinContainer],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: SAFE_MENTIONS
        }).catch(() => { });
    }

    return giveaway;
}

// ============== SCHEDULE GIVEAWAY END ==============

function scheduleGiveawayEnd(client, giveaway, guildId) {
    const delay = giveaway.endTime - Date.now();
    if (delay <= 0) {
        // Already past end time, end immediately
        endGiveawayLogic(client, giveaway, guildId);
        return;
    }

    setTimeout(async () => {
        const current = giveawayDb.getGiveaway(guildId, giveaway.messageId);
        if (current && !current.ended && Date.now() >= current.endTime) {
            await endGiveawayLogic(client, current, guildId);
        }
    }, delay);
}

// ============== COMMAND DEFINITION ==============

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Create and manage giveaways')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(sub => sub
            .setName('start')
            .setDescription('Start a new giveaway')
            .addChannelOption(opt => opt
                .setName('channel')
                .setDescription('Channel to host the giveaway')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true))
            .addStringOption(opt => opt
                .setName('duration')
                .setDescription('Duration (e.g., 1d, 2h30m, 1d12h)')
                .setRequired(true))
            .addIntegerOption(opt => opt
                .setName('winners')
                .setDescription('Number of winners (1-50)')
                .setMinValue(1)
                .setMaxValue(50)
                .setRequired(true))
            .addStringOption(opt => opt
                .setName('prize')
                .setDescription('The prize to give away')
                .setRequired(true))
            .addStringOption(opt => opt
                .setName('description')
                .setDescription('Description for the giveaway')
                .setRequired(false))
            .addStringOption(opt => opt
                .setName('color')
                .setDescription('Accent color (hex, e.g., #8A5FFF)')
                .setRequired(false))
            .addStringOption(opt => opt
                .setName('image')
                .setDescription('Image URL for the giveaway')
                .setRequired(false))
            .addStringOption(opt => opt
                .setName('thumbnail')
                .setDescription('Thumbnail URL for the giveaway')
                .setRequired(false))
            .addRoleOption(opt => opt
                .setName('requiredrole')
                .setDescription('Role required to enter')
                .setRequired(false))
            .addRoleOption(opt => opt
                .setName('prizerole')
                .setDescription('Role given to winners')
                .setRequired(false))
            .addIntegerOption(opt => opt
                .setName('minlevel')
                .setDescription('Minimum level to enter')
                .setMinValue(0)
                .setRequired(false))
            .addIntegerOption(opt => opt
                .setName('maxlevel')
                .setDescription('Maximum level to enter')
                .setMinValue(0)
                .setRequired(false))
            .addIntegerOption(opt => opt
                .setName('minage')
                .setDescription('Minimum account age in days')
                .setMinValue(0)
                .setRequired(false))
            .addIntegerOption(opt => opt
                .setName('minstay')
                .setDescription('Minimum server stay in days')
                .setMinValue(0)
                .setRequired(false))
            .addUserOption(opt => opt
                .setName('host')
                .setDescription('Custom host for the giveaway')
                .setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('end')
            .setDescription('End a giveaway early')
            .addStringOption(opt => opt
                .setName('message_id')
                .setDescription('Message ID or link of the giveaway')
                .setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('reroll')
            .setDescription('Reroll winners for an ended giveaway')
            .addStringOption(opt => opt
                .setName('message_id')
                .setDescription('Message ID or link of the giveaway')
                .setRequired(true))
            .addIntegerOption(opt => opt
                .setName('winners')
                .setDescription('Number of winners to reroll')
                .setMinValue(1)
                .setMaxValue(50)
                .setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('cancel')
            .setDescription('Cancel a giveaway')
            .addStringOption(opt => opt
                .setName('message_id')
                .setDescription('Message ID or link of the giveaway')
                .setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('List all giveaways in this server')
        )
        .addSubcommand(sub => sub
            .setName('edit')
            .setDescription('Edit an active giveaway')
            .addStringOption(opt => opt
                .setName('message_id')
                .setDescription('Message ID or link of the giveaway')
                .setRequired(true))
            .addStringOption(opt => opt
                .setName('property')
                .setDescription('Property to edit')
                .setRequired(true)
                .addChoices(
                    { name: 'Prize', value: 'prize' },
                    { name: 'Winners', value: 'winners' },
                    { name: 'Duration', value: 'duration' },
                    { name: 'Description', value: 'description' },
                    { name: 'Color', value: 'color' },
                    { name: 'Image', value: 'image' },
                    { name: 'Thumbnail', value: 'thumbnail' }
                ))
            .addStringOption(opt => opt
                .setName('value')
                .setDescription('New value for the property')
                .setRequired(true))
        ),

    // Export utilities for button handlers
    checkRequirements,
    buildGiveawayContainer,
    endGiveawayLogic,
    scheduleGiveawayEnd,

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // ============== START SUBCOMMAND ==============
        if (subcommand === 'start') {
            const channel = interaction.options.getChannel('channel');
            const durationStr = interaction.options.getString('duration');
            const winnerCount = interaction.options.getInteger('winners');
            const prize = interaction.options.getString('prize');

            const durationMs = parseDuration(durationStr);
            if (!durationMs) {
                const errContainer = buildResponseContainer(`❌ Invalid duration. Use formats like \`1d\`, \`2h30m\`, \`1d12h\``);
                return interaction.reply({
                    components: [errContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const endTime = Date.now() + durationMs;
            const giveawayId = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

            const giveaway = {
                giveawayId,
                messageId: null,
                channelId: channel.id,
                guildId: interaction.guild.id,
                hostId: interaction.options.getUser('host')?.id || interaction.user.id,
                prize,
                description: interaction.options.getString('description') || null,
                winnerCount,
                entries: [],
                winners: [],
                startTime: Date.now(),
                endTime,
                ended: false,
                color: null,
                thumbnail: interaction.options.getString('thumbnail') || null,
                image: interaction.options.getString('image') || null,
                requiredRoles: [],
                winnerRoles: [],
                minLevel: interaction.options.getInteger('minlevel') || 0,
                maxLevel: interaction.options.getInteger('maxlevel') || 0,
                minAge: interaction.options.getInteger('minage') || 0,
                minStay: interaction.options.getInteger('minstay') || 0
            };

            // Parse color
            const colorStr = interaction.options.getString('color');
            if (colorStr) {
                const hex = colorStr.replace('#', '');
                if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
                    giveaway.color = parseInt(hex, 16);
                }
            }

            // Required role
            const reqRole = interaction.options.getRole('requiredrole');
            if (reqRole) giveaway.requiredRoles = [reqRole.id];

            // Prize role
            const prizeRole = interaction.options.getRole('prizerole');
            if (prizeRole) giveaway.winnerRoles = [prizeRole.id];

            // Send giveaway message with Components v2
            const container = buildGiveawayContainer(giveaway);
            const sentMsg = await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: SAFE_MENTIONS
            });
            giveaway.messageId = sentMsg.id;

            // Save to database
            giveawayDb.createGiveaway(interaction.guild.id, giveaway);

            // Schedule end
            scheduleGiveawayEnd(interaction.client, giveaway, interaction.guild.id);

            const successContainer = buildResponseContainer(`✅ Giveaway started in ${channel}!\n🔗 ${sentMsg.url}`);
            return interaction.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        // ============== END SUBCOMMAND ==============
        if (subcommand === 'end') {
            const link = interaction.options.getString('message_id');
            const parsed = parseMessageIdentifier(link);
            if (!parsed) {
                const errContainer = buildResponseContainer(`❌ Please provide a valid message link or ID.`);
                return interaction.reply({
                    components: [errContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            let giveaway = giveawayDb.getGiveaway(interaction.guild.id, parsed.messageId);
            if (!giveaway) {
                giveaway = giveawayDb.getGiveawayById(interaction.guild.id, parsed.messageId);
            }
            if (!giveaway) {
                const errContainer = buildResponseContainer(`❌ Giveaway not found.`);
                return interaction.reply({
                    components: [errContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }
            if (giveaway.ended) {
                const errContainer = buildResponseContainer(`❌ This giveaway has already ended.`);
                return interaction.reply({
                    components: [errContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            await endGiveawayLogic(interaction.client, giveaway, interaction.guild.id);
            const successContainer = buildResponseContainer(`✅ Giveaway ended early!`);
            return interaction.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        // ============== REROLL SUBCOMMAND ==============
        if (subcommand === 'reroll') {
            const link = interaction.options.getString('message_id');
            const parsed = parseMessageIdentifier(link);
            if (!parsed) {
                const errContainer = buildResponseContainer(`❌ Please provide a valid message link or ID.`);
                return interaction.reply({
                    components: [errContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            let giveaway = giveawayDb.getGiveaway(interaction.guild.id, parsed.messageId);
            if (!giveaway) {
                giveaway = giveawayDb.getGiveawayById(interaction.guild.id, parsed.messageId);
            }
            if (!giveaway) {
                const errContainer = buildResponseContainer(`❌ Giveaway not found.`);
                return interaction.reply({
                    components: [errContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }
            if (!giveaway.ended) {
                const errContainer = buildResponseContainer(`❌ This giveaway hasn't ended yet. Use \`/giveaway end\` first.`);
                return interaction.reply({
                    components: [errContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const rerollCount = interaction.options.getInteger('winners') || giveaway.winnerCount;

            // Validate entries
            const validEntries = [];
            for (const userId of giveaway.entries || []) {
                const member = await interaction.guild.members.fetch(userId).catch(() => null);
                if (member) {
                    const errors = await checkRequirements(member, giveaway);
                    if (errors.length === 0) validEntries.push(userId);
                }
            }

            const newWinners = pickWinners(validEntries, rerollCount);
            if (newWinners.length === 0) {
                const errContainer = buildResponseContainer(`❌ No valid entries to reroll.`);
                return interaction.reply({
                    components: [errContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            giveaway.winners = newWinners;
            giveawayDb.updateGiveaway(interaction.guild.id, giveaway);

            // Update message and announce
            const channel = await interaction.guild.channels.fetch(giveaway.channelId).catch(() => null);
            if (channel) {
                const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
                if (msg) {
                    const container = buildGiveawayContainer(giveaway, true);
                    await msg.edit({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: SAFE_MENTIONS
                    }).catch(() => { });
                }

                await awardWinnerRoles(interaction.guild, giveaway);

                const winnerMentions = newWinners.map(id => `<@${id}>`).join(', ');
                const rerollContainer = buildResponseContainer(`# 🎊 Reroll!\nCongratulations ${winnerMentions}! You won **${giveaway.prize}**!`);
                await channel.send({
                    components: [rerollContainer],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { users: newWinners }
                }).catch(() => { });
            }

            const successContainer = buildResponseContainer(`✅ Rerolled **${newWinners.length}** winner(s)!`);
            return interaction.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        // ============== CANCEL SUBCOMMAND ==============
        if (subcommand === 'cancel') {
            const link = interaction.options.getString('message_id');
            const parsed = parseMessageIdentifier(link);
            if (!parsed) {
                const errContainer = buildResponseContainer(`❌ Please provide a valid message link or ID.`);
                return interaction.reply({
                    components: [errContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            let giveaway = giveawayDb.getGiveaway(interaction.guild.id, parsed.messageId);
            if (!giveaway) {
                giveaway = giveawayDb.getGiveawayById(interaction.guild.id, parsed.messageId);
            }
            if (!giveaway) {
                const errContainer = buildResponseContainer(`❌ Giveaway not found.`);
                return interaction.reply({
                    components: [errContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            // Delete giveaway message
            const channel = await interaction.guild.channels.fetch(giveaway.channelId).catch(() => null);
            if (channel) {
                const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
                if (msg) await msg.delete().catch(() => { });
            }

            // Remove from database
            giveawayDb.deleteGiveaway(interaction.guild.id, giveaway.messageId);

            const successContainer = buildResponseContainer(`✅ Giveaway cancelled and deleted.`);
            return interaction.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        // ============== LIST SUBCOMMAND ==============
        if (subcommand === 'list') {
            const giveaways = giveawayDb.getAllGiveaways(interaction.guild.id);
            if (giveaways.length === 0) {
                const errContainer = buildResponseContainer(`❌ No giveaways found.`);
                return interaction.reply({
                    components: [errContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td => td.setContent('# 🎉 Giveaways'));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

            const active = giveaways.filter(g => !g.ended);
            const ended = giveaways.filter(g => g.ended);

            if (active.length > 0) {
                let activeText = '### Active Giveaways\n';
                for (const g of active.slice(0, 10)) {
                    activeText += `• **${g.prize}** - ${g.entries?.length || 0} entries - Ends ${formatTimestamp(g.endTime)}\n`;
                    activeText += `  [Jump to message](https://discord.com/channels/${interaction.guild.id}/${g.channelId}/${g.messageId})\n`;
                }
                container.addTextDisplayComponents(td => td.setContent(activeText));
            }

            if (ended.length > 0) {
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                let endedText = '### Past Giveaways\n';
                for (const g of ended.slice(0, 10)) {
                    const winners = g.winners?.length > 0 ? g.winners.map(id => `<@${id}>`).join(', ') : 'None';
                    endedText += `• **${g.prize}** - Winners: ${winners}\n`;
                }
                container.addTextDisplayComponents(td => td.setContent(endedText));
            }

            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(`-# ${getFooterText()}`));

            return interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        // ============== EDIT SUBCOMMAND ==============
        if (subcommand === 'edit') {
            const link = interaction.options.getString('message_id');
            const parsed = parseMessageIdentifier(link);
            if (!parsed) {
                const errContainer = buildResponseContainer(`❌ Please provide a valid message link or ID.`);
                return interaction.reply({
                    components: [errContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            let giveaway = giveawayDb.getGiveaway(interaction.guild.id, parsed.messageId);
            if (!giveaway) {
                giveaway = giveawayDb.getGiveawayById(interaction.guild.id, parsed.messageId);
            }
            if (!giveaway) {
                const errContainer = buildResponseContainer(`❌ Giveaway not found.`);
                return interaction.reply({
                    components: [errContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }
            if (giveaway.ended) {
                const errContainer = buildResponseContainer(`❌ Cannot edit an ended giveaway.`);
                return interaction.reply({
                    components: [errContainer],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            const property = interaction.options.getString('property');
            const value = interaction.options.getString('value');

            switch (property) {
                case 'prize':
                    giveaway.prize = value;
                    break;
                case 'winners':
                    const count = parseInt(value, 10);
                    if (!count || count < 1 || count > 50) {
                        const errContainer = buildResponseContainer(`❌ Winner count must be between 1 and 50.`);
                        return interaction.reply({
                            components: [errContainer],
                            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                        });
                    }
                    giveaway.winnerCount = count;
                    break;
                case 'duration':
                    const ms = parseDuration(value);
                    if (!ms) {
                        const errContainer = buildResponseContainer(`❌ Invalid duration format.`);
                        return interaction.reply({
                            components: [errContainer],
                            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                        });
                    }
                    giveaway.endTime = Date.now() + ms;
                    scheduleGiveawayEnd(interaction.client, giveaway, interaction.guild.id);
                    break;
                case 'description':
                    giveaway.description = value === 'none' ? null : value;
                    break;
                case 'color':
                    if (value.toLowerCase() === 'none') {
                        giveaway.color = null;
                    } else {
                        const hex = value.replace('#', '');
                        if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
                            const errContainer = buildResponseContainer(`❌ Invalid hex color. Use format like \`#FF5733\` or \`none\`.`);
                            return interaction.reply({
                                components: [errContainer],
                                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                            });
                        }
                        giveaway.color = parseInt(hex, 16);
                    }
                    break;
                case 'image':
                    if (value.toLowerCase() === 'none') {
                        giveaway.image = null;
                    } else if (!/^https?:\/\/.+/.test(value)) {
                        const errContainer = buildResponseContainer(`❌ Please provide a valid image URL.`);
                        return interaction.reply({
                            components: [errContainer],
                            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                        });
                    } else {
                        giveaway.image = value;
                    }
                    break;
                case 'thumbnail':
                    if (value.toLowerCase() === 'none') {
                        giveaway.thumbnail = null;
                    } else if (!/^https?:\/\/.+/.test(value)) {
                        const errContainer = buildResponseContainer(`❌ Please provide a valid thumbnail URL.`);
                        return interaction.reply({
                            components: [errContainer],
                            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                        });
                    } else {
                        giveaway.thumbnail = value;
                    }
                    break;
            }

            // Update database
            giveawayDb.updateGiveaway(interaction.guild.id, giveaway);

            // Update message
            const channel = await interaction.guild.channels.fetch(giveaway.channelId).catch(() => null);
            if (channel) {
                const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
                if (msg) {
                    const container = buildGiveawayContainer(giveaway);
                    await msg.edit({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: SAFE_MENTIONS
                    }).catch(() => { });
                }
            }

            const successContainer = buildResponseContainer(`✅ Giveaway updated! Property \`${property}\` set to \`${value}\`.`);
            return interaction.reply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }
    }
};
