const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ContainerBuilder, MessageFlags, SeparatorSpacingSize } = require('../utils/componentBuilders.js');
const { EMOJIS, ModerationPermissions, getModerationPermissionErrors, parseUserInput, formatUserDisplay } = require('../utils/migrationUtils.js');
const db = require('../database/db.js');
const warningDb = require('../database/warningDb.js');

/* --- Helpers --- */
const generateCaseNumber = (guildData) => {
    if (!guildData.moderation) guildData.moderation = {};
    if (!guildData.moderation.actions) guildData.moderation.actions = [];
    return guildData.moderation.actions.length + 1;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Moderation commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addSubcommand(sub =>
            sub.setName('ban')
                .setDescription('Ban a user from the server')
                .addUserOption(option =>
                    option.setName('user').setDescription('The user to ban').setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reason').setDescription('Reason for the ban').setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('warn')
                .setDescription('Warn a user')
                .addUserOption(option =>
                    option.setName('user').setDescription('The user to warn').setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reason').setDescription('Reason for the warning').setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('clear-warnings')
                .setDescription('Clear all warnings for a user')
                .addUserOption(option =>
                    option.setName('user').setDescription('The user to clear warnings for').setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guild = interaction.guild;
        const member = interaction.member;

        // Fetch Member if possible for role checks
        let targetUser = interaction.options.getUser('user');

        // Handle optional user for 'warnings' subcommand - default to self
        if (!targetUser && subcommand === 'warnings') {
            targetUser = interaction.user;
        }

        // Return early with error if user is still null (required field missing)
        if (!targetUser) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Error`))
                .addTextDisplayComponents(td => td.setContent('Please specify a user.'));
            container.addTextDisplayComponents(td => td.setContent(`**UnderFive Studios** | <t:${Math.floor(Date.now() / 1000)}:R>`));
            const data = container.toJSON();
            return interaction.reply({
                embeds: data.embeds,
                components: data.components,
                ephemeral: true
            });
        }

        let targetMember;
        try {
            targetMember = await guild.members.fetch(targetUser.id);
        } catch {
            targetMember = { id: targetUser.id, user: targetUser, roles: { highest: { position: -1 } }, guild };
        }

        // --- BAN SUBCOMMAND ---
        if (subcommand === 'ban') {
            const reason = interaction.options.getString('reason') || 'No reason provided';

            const permCheck = await ModerationPermissions.validatePermission(
                member,
                targetMember,
                interaction.client,
                guild.id,
                'ban'
            );

            if (!permCheck.allowed) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Permission Denied`))
                    .addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(td => td.setContent(getModerationPermissionErrors[permCheck.reason] || 'Unknown permission error.'));
                // Footer
                // Footer
                container.addTextDisplayComponents(td => td.setContent("**UnderFive Studios** • Discord Automation"));

                const data = container.toJSON();
                return interaction.reply({
                    embeds: data.embeds,
                    components: data.components,
                    ephemeral: true
                });
            }

            // Perform Ban
            try {
                // DB Logging
                const guildData = db.getModerationData(guild.id);
                const caseNumber = generateCaseNumber(guildData);

                guildData.moderation.actions.push({
                    caseNumber,
                    type: 'ban',
                    userId: targetUser.id,
                    moderator: { id: member.user.id, username: member.user.username },
                    reason,
                    timestamp: new Date()
                });

                db.saveModerationData(guild.id, guildData.moderation);

                // Execute Ban
                await guild.members.ban(targetUser.id, { reason, deleteMessageSeconds: 86400 });

                // Success Response
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.banned} User Banned`))
                    .addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(td =>
                        td.setContent(
                            `**User:** ${formatUserDisplay(targetUser)}\n` +
                            `**Reason:** ${reason}\n` +
                            `**Case:** #${caseNumber}`
                        )
                    );
                // Footer
                container.addTextDisplayComponents(td => td.setContent("**UnderFive Studios** • Discord Automation"));

                const data = container.toJSON();
                await interaction.reply({
                    embeds: data.embeds,
                    components: data.components
                });

            } catch (error) {
                console.error('Ban error:', error);
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Error`))
                    .addTextDisplayComponents(td => td.setContent('Failed to ban user. Check my permissions.'));
                // Footer
                container.addTextDisplayComponents(td => td.setContent("**UnderFive Studios** • Discord Automation"));

                const data = container.toJSON();
                await interaction.reply({
                    embeds: data.embeds,
                    components: data.components,
                    ephemeral: true
                });
            }
        }

        // --- WARN SUBCOMMAND ---
        else if (subcommand === 'warn') {
            const reason = interaction.options.getString('reason');

            const permCheck = await ModerationPermissions.validatePermission(
                member,
                targetMember,
                interaction.client,
                guild.id,
                'moderate_members' // Using generic moderation permission check
            );

            if (!permCheck.allowed) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Permission Denied`))
                    .addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(td => td.setContent(getModerationPermissionErrors[permCheck.reason] || 'Unknown permission error.'));

                container.addTextDisplayComponents(td => td.setContent("**UnderFive Studios** • Discord Automation"));

                const data = container.toJSON();
                return interaction.reply({
                    embeds: data.embeds,
                    components: data.components,
                    ephemeral: true
                });
            }

            try {
                // DB Logging for Case System
                const guildData = db.getModerationData(guild.id);
                const caseNumber = generateCaseNumber(guildData);

                // 1. Log Action
                guildData.moderation.actions.push({
                    caseNumber,
                    type: 'warn',
                    userId: targetUser.id,
                    moderator: { id: member.user.id, username: member.user.username },
                    reason,
                    timestamp: new Date()
                });
                db.saveModerationData(guild.id, guildData.moderation);

                // 2. Add Warning
                warningDb.addWarning(guild.id, targetUser.id, member.id, reason);
                const warningCount = warningDb.getWarningCount(guild.id, targetUser.id);

                // 3. DM User
                try {
                    await targetUser.send({
                        embeds: [{
                            color: 0xFFA500,
                            title: `⚠️ You've been warned in ${guild.name}`,
                            description: `You have been warned by ${member.user.username}.`,
                            fields: [{ name: 'Reason', value: reason }],
                            footer: { text: `Case #${caseNumber}` },
                            timestamp: new Date()
                        }]
                    });
                } catch (dmError) {
                    // Ignore DM error
                }

                // 4. Success Response
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.warn || '⚠️'} User Warned`))
                    .addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(td =>
                        td.setContent(
                            `**User:** ${formatUserDisplay(targetUser)}\n` +
                            `**Reason:** ${reason}\n` +
                            `**Warnings:** ${warningCount}\n` +
                            `**Case:** #${caseNumber}`
                        )
                    );

                container.addTextDisplayComponents(td => td.setContent("**UnderFive Studios** • Discord Automation"));

                const data = container.toJSON();
                await interaction.reply({
                    embeds: data.embeds,
                    components: data.components
                });

            } catch (error) {
                console.error('Warn error:', error);
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Error`))
                    .addTextDisplayComponents(td => td.setContent('An error occurred while warning the user.'));

                container.addTextDisplayComponents(td => td.setContent("**UnderFive Studios** • Discord Automation"));

                const data = container.toJSON();
                await interaction.reply({
                    embeds: data.embeds,
                    components: data.components,
                    ephemeral: true
                });
            }
        }

        // --- CLEAR WARNINGS SUBCOMMAND ---
        else if (subcommand === 'clear-warnings') {
            const permCheck = await ModerationPermissions.validatePermission(
                member,
                targetMember,
                interaction.client,
                guild.id,
                'moderate_members'
            );

            if (!permCheck.allowed) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Permission Denied`))
                    .addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(td => td.setContent(getModerationPermissionErrors[permCheck.reason] || 'Unknown permission error.'));

                container.addTextDisplayComponents(td => td.setContent("**UnderFive Studios** • Discord Automation"));

                const data = container.toJSON();
                return interaction.reply({
                    embeds: data.embeds,
                    components: data.components,
                    ephemeral: true
                });
            }

            try {
                const clearedCount = warningDb.clearWarnings(guild.id, targetUser.id, member.id);

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.refresh || '🔄'} Warnings Cleared`))
                    .addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
                    .addTextDisplayComponents(td =>
                        td.setContent(
                            `**User:** ${formatUserDisplay(targetUser)}\n` +
                            `**Cleared:** ${clearedCount} warnings`
                        )
                    );

                container.addTextDisplayComponents(td => td.setContent("**UnderFive Studios** • Discord Automation"));

                const data = container.toJSON();
                await interaction.reply({
                    embeds: data.embeds,
                    components: data.components
                });

            } catch (error) {
                console.error('Clear warnings error:', error);
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Error`))
                    .addTextDisplayComponents(td => td.setContent('An error occurred while clearing warnings.'));

                container.addTextDisplayComponents(td => td.setContent("**UnderFive Studios** • Discord Automation"));

                const data = container.toJSON();
                await interaction.reply({
                    embeds: data.embeds,
                    components: data.components,
                    ephemeral: true
                });
            }
        }

        // --- WARNINGS SUBCOMMAND (VIEW) ---
        else if (subcommand === 'warnings') {
            try {
                const warnings = warningDb.getWarnings(guild.id, targetUser.id);
                const container = new ContainerBuilder();

                if (warnings.length === 0) {
                    container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.members || '👥'} User Warnings`));
                    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                    container.addTextDisplayComponents(td =>
                        td.setContent(`**${formatUserDisplay(targetUser)}** has no active warnings.`)
                    );
                } else {
                    container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.warn || '⚠️'} User Warnings`));
                    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

                    const warningList = warnings.map((w, index) => {
                        const date = new Date(w.timestamp).toLocaleDateString();
                        const moderator = w.moderatorId ? `<@${w.moderatorId}>` : 'Unknown';
                        return `**${index + 1}.** ${w.reason} - ${moderator} (${date})`;
                    }).join('\n');

                    container.addTextDisplayComponents(td =>
                        td.setContent(
                            `Active warnings for **${formatUserDisplay(targetUser)}**:\n\n${warningList}`
                        )
                    );
                }

                container.addTextDisplayComponents(td => td.setContent(`**UnderFive Studios** | <t:${Math.floor(Date.now() / 1000)}:R>`));

                const data = container.toJSON();
                await interaction.reply({
                    embeds: data.embeds,
                    components: data.components
                });

            } catch (error) {
                console.error('View warnings error:', error);
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.error} Error`))
                    .addTextDisplayComponents(td => td.setContent('An error occurred while fetching warnings.'));

                container.addTextDisplayComponents(td => td.setContent(`**UnderFive Studios** | <t:${Math.floor(Date.now() / 1000)}:R>`));

                const data = container.toJSON();
                await interaction.reply({
                    embeds: data.embeds,
                    components: data.components,
                    ephemeral: true
                });
            }
        }
    }
};
