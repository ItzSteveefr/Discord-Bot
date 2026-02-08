const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { getAutomodConfig, saveAutomodConfig, getDefaultConfig } = require('../../database/automodDb');
const {
    MODULES, PUNISHMENTS, PRESETS,
    buildWizardContainer, buildModulesPage, buildPunishmentsPage,
    buildIgnorePage, buildWordsPage, buildStrikesPage
} = require('../../utils/automodUtils');
const EMOJIS = require('../../utils/emojis');

module.exports = {
    customId: 'automod_engine', // Placeholder ID to satisfy button loader requirements

    // Dynamic matching for all automod buttons
    match: (customId) => customId.startsWith('automod_'),

    async execute(interaction) {
        const { customId, guildId } = interaction;
        const config = getAutomodConfig(guildId);

        // --- Navigation ---
        if (customId === 'automod_back_main') {
            const container = buildWizardContainer(config);
            return interaction.update({ components: [container] });
        }

        if (customId === 'automod_page_modules') {
            const container = buildModulesPage(config);
            return interaction.update({ components: [container] });
        }

        if (customId === 'automod_page_punishments') {
            const container = buildPunishmentsPage(config);
            return interaction.update({ components: [container] });
        }

        if (customId === 'automod_page_ignore') {
            const container = buildIgnorePage(config);
            return interaction.update({ components: [container] });
        }

        if (customId === 'automod_page_words') {
            const container = buildWordsPage(config);
            return interaction.update({ components: [container] });
        }

        if (customId === 'automod_page_strikes') {
            const container = buildStrikesPage(config);
            return interaction.update({ components: [container] });
        }

        // --- Global Toggles ---
        if (customId === 'automod_toggle_on') {
            config.enabled = true;
            saveAutomodConfig(guildId, config);
            const container = buildWizardContainer(config);
            return interaction.update({ components: [container] });
        }

        if (customId === 'automod_toggle_off') {
            config.enabled = false;
            saveAutomodConfig(guildId, config);
            const container = buildWizardContainer(config);
            return interaction.update({ components: [container] });
        }

        if (customId === 'automod_logchannel') {
            return interaction.reply({
                content: `${EMOJIS.info} **Log Channel Setup**\nUse the slash command: \`/automod logchannel <channel>\``,
                flags: MessageFlags.Ephemeral
            });
        }

        // --- Presets ---
        if (customId.startsWith('automod_preset_')) {
            const presetName = customId.replace('automod_preset_', '');
            const preset = PRESETS[presetName];

            if (preset) {
                // Apply preset
                for (const modKey of Object.keys(MODULES)) {
                    // Ensure module config exists
                    if (!config.modules[modKey]) {
                        config.modules[modKey] = { enabled: false, punishments: [MODULES[modKey].defaultPunishment], strikes: 1, ignore: { channels: [], roles: [] } };
                    }
                    config.modules[modKey].enabled = preset.modules.includes(modKey);
                }
                config.enabled = true;
                config.activePreset = presetName;
                saveAutomodConfig(guildId, config);

                const container = buildWizardContainer(config);
                return interaction.update({ components: [container] });
            }
        }

        // --- Modules ---
        if (customId === 'automod_modules_all_on') {
            for (const key of Object.keys(MODULES)) {
                if (!config.modules[key]) config.modules[key] = { enabled: false, punishments: ['delete'], strikes: 1 };
                config.modules[key].enabled = true;
            }
            saveAutomodConfig(guildId, config);
            const container = buildModulesPage(config);
            return interaction.update({ components: [container] });
        }

        if (customId === 'automod_modules_all_off') {
            for (const key of Object.keys(MODULES)) {
                if (config.modules[key]) config.modules[key].enabled = false;
            }
            saveAutomodConfig(guildId, config);
            const container = buildModulesPage(config);
            return interaction.update({ components: [container] });
        }

        // Module Select Menu
        if (customId === 'automod_module_toggle') {
            const selectedModules = interaction.values;

            // Re-fetch clean config to ensure we're toggling correctly
            // But here we need to know what was selected. 
            // The select menu returns ALL currently selected values.
            // However, discord select menus act as "set", not "toggle" relative to previous state in typical UX,
            // but for a multi-select menu in this context, usually we want to set the state to exactly what's selected.

            // Wait, standard select menu UX:
            // "Select modules to toggle..." -> likely used to FLIP state or SET state?
            // The UI shows current state in description.
            // Let's assume this multi-select toggles the state of selected items.

            for (const modKey of selectedModules) {
                if (!config.modules[modKey]) config.modules[modKey] = { enabled: false, punishments: ['delete'], strikes: 1 };
                config.modules[modKey].enabled = !config.modules[modKey].enabled;
            }

            saveAutomodConfig(guildId, config);
            const container = buildModulesPage(config);
            return interaction.update({ components: [container] });
        }

        // --- Punishments ---
        if (customId === 'automod_punishment_select_module') {
            const selectedModule = interaction.values[0];
            const container = buildPunishmentsPage(config, selectedModule);
            return interaction.update({ components: [container] });
        }

        if (customId.startsWith('automod_punishment_set_')) {
            const moduleName = customId.replace('automod_punishment_set_', '');
            const selectedPunishments = interaction.values;

            if (config.modules[moduleName]) {
                config.modules[moduleName].punishments = selectedPunishments;
                saveAutomodConfig(guildId, config);
            }

            const container = buildPunishmentsPage(config, moduleName);
            return interaction.update({ components: [container] });
        }

        // --- Ignored Rules ---
        if (customId === 'automod_ignore_type') {
            const type = interaction.values[0];

            if (type === 'clear_all') {
                config.ignore = { channels: [], roles: [], users: [] };
                saveAutomodConfig(guildId, config);
                const container = buildIgnorePage(config);
                return interaction.update({ components: [container] });
            }

            if (type === 'per_module') {
                // We need to show a module selector first for this path, 
                // but the UI flow in automodUtils might not support it directly without a new page.
                // For now, let's just tell them to use the command for granular control or specific buttons if implemented.
                // Actually, looking at automodUtils, buildIgnorePage has a dropdown.
                // Let's implement a simple module selector for per-module ignores.

                // Reuse module selection logic
                // For now, simpler approach: reply with ephemeral instruction
                return interaction.reply({
                    content: `${EMOJIS.info} **Per-Module Ignore**\nPlease use the command: \`/automod ignore <target> [module]\``,
                    flags: MessageFlags.Ephemeral
                });
            }

            return interaction.reply({
                content: `${EMOJIS.info} **Adding Ignores**\nPlease use the command: \`/automod ignore <channel|role|user>\``,
                flags: MessageFlags.Ephemeral
            });
        }

        // --- Bad Words ---
        if (customId === 'automod_words_add') {
            const modal = new ModalBuilder()
                .setCustomId('automod_words_add_modal')
                .setTitle('Add Bad Words');

            const input = new TextInputBuilder()
                .setCustomId('words')
                .setLabel('Words (one per line)')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('badword1\nbadword2')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (customId === 'automod_words_remove') {
            // For removal, better to list them or use a modal to type what to remove
            // Since list can be long, let's use a modal to "Bulk Remove"
            const modal = new ModalBuilder()
                .setCustomId('automod_words_bulk_remove_modal')
                .setTitle('Remove Bad Words');

            const input = new TextInputBuilder()
                .setCustomId('words')
                .setLabel('Words to Remove (one per line)')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('badword1\nbadword2')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (customId === 'automod_words_clear') {
            if (config.modules.badwords) {
                config.modules.badwords.words = [];
                saveAutomodConfig(guildId, config);
            }
            const container = buildWordsPage(config);
            return interaction.update({ components: [container] });
        }

        if (customId === 'automod_words_bulk_remove') {
            const modal = new ModalBuilder()
                .setCustomId('automod_words_bulk_remove_modal')
                .setTitle('Remove Bad Words');

            const input = new TextInputBuilder()
                .setCustomId('words')
                .setLabel('Words to Remove (one per line)')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('badword1\nbadword2')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        // --- Strikes ---
        if (customId === 'automod_strikes_toggle') {
            config.strikesEnabled = !config.strikesEnabled;
            saveAutomodConfig(guildId, config);
            const container = buildStrikesPage(config);
            return interaction.update({ components: [container] });
        }

        if (customId === 'automod_strike_threshold') {
            const selected = interaction.values[0];

            if (selected === 'expiry') {
                const modal = new ModalBuilder()
                    .setCustomId('automod_strike_expiry_modal')
                    .setTitle('Strike Expiry Time');

                const input = new TextInputBuilder()
                    .setCustomId('hours')
                    .setLabel('Expiry Hours')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('24')
                    .setValue(String(config.strikeExpiry || 24))
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return interaction.showModal(modal);
            }

            // For threshold actions (3, 5, 7, 10), open a modal to configure the action
            const threshold = selected;
            const modal = new ModalBuilder()
                .setCustomId(`automod_strike_action_modal_${threshold}`)
                .setTitle(`Configure ${threshold} Strikes Action`);

            const actionInput = new TextInputBuilder()
                .setCustomId('action')
                .setLabel('Action (mute, kick, ban)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('mute')
                .setRequired(true);

            const durationInput = new TextInputBuilder()
                .setCustomId('duration')
                .setLabel('Duration (if mute) e.g. 10m, 1h')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('1h')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(actionInput),
                new ActionRowBuilder().addComponents(durationInput)
            );
            return interaction.showModal(modal);
        }
    }
};
