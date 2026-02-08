const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const { getAutomodConfig, saveAutomodConfig, resetAutomodConfig } = require('../database/automodDb');
const { MODULES, PRESETS, buildWizardContainer, buildConfigContainer } = require('../utils/automodUtils');
const EMOJIS = require('../utils/emojis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configure automatic message moderation')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Open the automod control panel'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable automod system'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable automod system'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('preset')
                .setDescription('Apply a protection preset')
                .addStringOption(option =>
                    option
                        .setName('level')
                        .setDescription('Protection level')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Strict - Maximum protection', value: 'strict' },
                            { name: 'Moderate - Balanced protection', value: 'moderate' },
                            { name: 'Light - Basic protection', value: 'light' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('View current automod configuration'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('logchannel')
                .setDescription('Set the automod log channel')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to log violations to')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset automod to default settings')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        switch (subcommand) {
            case 'panel':
                return this.showPanel(interaction, guildId);
            case 'enable':
                return this.toggleAutomod(interaction, guildId, true);
            case 'disable':
                return this.toggleAutomod(interaction, guildId, false);
            case 'preset':
                return this.applyPreset(interaction, guildId);
            case 'config':
                return this.showConfig(interaction, guildId);
            case 'logchannel':
                return this.setLogChannel(interaction, guildId);
            case 'reset':
                return this.resetConfig(interaction, guildId);
            default:
                return this.showPanel(interaction, guildId);
        }
    },

    async showPanel(interaction, guildId) {
        const config = getAutomodConfig(guildId);
        const container = buildWizardContainer(config);

        const reply = await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

        // Store wizard session for button handling
        if (!interaction.client.automodWizards) {
            interaction.client.automodWizards = new Map();
        }
        interaction.client.automodWizards.set(reply.id, {
            authorId: interaction.user.id,
            createdAt: Date.now(),
            guildId: guildId
        });

        // Auto-expire after 5 minutes
        setTimeout(async () => {
            try {
                const freshConfig = getAutomodConfig(guildId);
                const disabledContainer = buildWizardContainer(freshConfig, true);
                await interaction.editReply({ components: [disabledContainer] }).catch(() => { });
                interaction.client.automodWizards?.delete(reply.id);
            } catch (e) { }
        }, 5 * 60 * 1000);
    },

    async toggleAutomod(interaction, guildId, enable) {
        const config = getAutomodConfig(guildId);

        if (config.enabled === enable) {
            return interaction.reply({
                content: `${EMOJIS.error} Automod is already **${enable ? 'enabled' : 'disabled'}**.`,
                flags: MessageFlags.Ephemeral
            });
        }

        config.enabled = enable;
        saveAutomodConfig(guildId, config);

        return interaction.reply({
            content: `${EMOJIS.success} Automod has been **${enable ? 'enabled' : 'disabled'}**.`,
            flags: MessageFlags.Ephemeral
        });
    },

    async applyPreset(interaction, guildId) {
        const presetName = interaction.options.getString('level');
        const preset = PRESETS[presetName];

        if (!preset) {
            return interaction.reply({
                content: `${EMOJIS.error} Invalid preset.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const config = getAutomodConfig(guildId);

        // Apply preset - enable specified modules, disable others
        for (const modKey of Object.keys(MODULES)) {
            if (!config.modules[modKey]) {
                config.modules[modKey] = {
                    enabled: false,
                    punishments: [MODULES[modKey].defaultPunishment],
                    strikes: MODULES[modKey].strikes,
                    ignore: { channels: [], roles: [] }
                };
            }
            config.modules[modKey].enabled = preset.modules.includes(modKey);
        }

        config.enabled = true;
        config.activePreset = presetName;
        saveAutomodConfig(guildId, config);

        const enabledModules = preset.modules.map(m => MODULES[m]?.name || m).join(', ');

        return interaction.reply({
            content: `${EMOJIS.success} **${preset.name}** preset applied!\n\n` +
                `Automod is now **enabled** with the following modules:\n${enabledModules}`,
            flags: MessageFlags.Ephemeral
        });
    },

    async showConfig(interaction, guildId) {
        const config = getAutomodConfig(guildId);
        const container = buildConfigContainer(config);

        return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
    },

    async setLogChannel(interaction, guildId) {
        const channel = interaction.options.getChannel('channel');
        const config = getAutomodConfig(guildId);

        config.logChannel = channel.id;
        saveAutomodConfig(guildId, config);

        return interaction.reply({
            content: `${EMOJIS.success} Automod violations will now be logged to ${channel}.`,
            flags: MessageFlags.Ephemeral
        });
    },

    async resetConfig(interaction, guildId) {
        resetAutomodConfig(guildId);

        return interaction.reply({
            content: `${EMOJIS.success} Automod settings have been reset to defaults.`,
            flags: MessageFlags.Ephemeral
        });
    }
};
