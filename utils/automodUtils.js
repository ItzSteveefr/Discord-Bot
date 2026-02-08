const { ContainerBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const EMOJIS = require('./emojis');

/**
 * Module definitions
 */
const MODULES = {
    antiinvite: { name: 'Anti-Invite', description: 'Blocks Discord server invite links', emoji: '🔗', defaultPunishment: 'delete', strikes: 1 },
    antilink: { name: 'Anti-Link', description: 'Blocks external URLs and links', emoji: '🌐', defaultPunishment: 'delete', strikes: 1 },
    antispam: { name: 'Anti-Spam', description: 'Prevents rapid/duplicate messages', emoji: '📨', defaultPunishment: 'warn', strikes: 1 },
    anticaps: { name: 'Anti-Caps', description: 'Blocks excessive capital letters', emoji: '🔠', defaultPunishment: 'delete', strikes: 0 },
    antimention: { name: 'Anti-Mass-Mention', description: 'Blocks mass user mentions', emoji: '📢', defaultPunishment: 'warn', strikes: 2 },
    antiemoji: { name: 'Anti-Emoji', description: 'Blocks excessive emoji spam', emoji: '😀', defaultPunishment: 'delete', strikes: 0 },
    badwords: { name: 'Bad Words', description: 'Filters custom banned words/phrases', emoji: '🤬', defaultPunishment: 'delete', strikes: 1 },
    maxlines: { name: 'Max Lines', description: 'Limits message line count', emoji: '📏', defaultPunishment: 'delete', strikes: 0 },
    antieveryone: { name: 'Anti-Mention', description: 'Blocks @everyone/@here and large role mentions', emoji: '📣', defaultPunishment: 'delete', strikes: 2 },
    antirole: { name: 'Anti-Role Mention', description: 'Blocks mentions of large roles', emoji: '🎭', defaultPunishment: 'warn', strikes: 2 },
    antizalgo: { name: 'Anti-Zalgo', description: 'Blocks zalgo/glitched text', emoji: '👾', defaultPunishment: 'delete', strikes: 0 },
    antinewlines: { name: 'Anti-Newlines', description: 'Blocks excessive blank lines', emoji: '↕️', defaultPunishment: 'delete', strikes: 0 },
    anticopypasta: { name: 'Anti-Copypasta', description: 'Blocks known spam copypastas', emoji: '📋', defaultPunishment: 'delete', strikes: 2 },
    antiai: { name: 'AI Toxicity', description: 'AI-powered content moderation', emoji: '🧪', defaultPunishment: 'delete', strikes: 1 }
};

/**
 * Punishment definitions
 */
const PUNISHMENTS = {
    warn: { name: 'Warn', description: 'Adds a warning to the user', emoji: '⚠️' },
    delete: { name: 'Delete', description: 'Deletes the message', emoji: '🗑️' },
    mute: { name: 'Mute', description: 'Mutes the user for 10 minutes', emoji: '🔇' },
    kick: { name: 'Kick', description: 'Kicks the user from server', emoji: '👢' },
    ban: { name: 'Ban', description: 'Bans the user from server', emoji: '🔨' },
    protocol: { name: 'Protocol', description: 'Removes all roles and applies 28-day timeout', emoji: '🚨' }
};

/**
 * Preset definitions
 */
const PRESETS = {
    strict: {
        name: 'Strict',
        description: 'Maximum protection - punishes most violations',
        modules: ['antiinvite', 'antilink', 'antispam', 'anticaps', 'antimention', 'antiemoji', 'antieveryone', 'antirole', 'antizalgo', 'antinewlines', 'anticopypasta']
    },
    moderate: {
        name: 'Moderate',
        description: 'Balanced protection for most servers',
        modules: ['antiinvite', 'antispam', 'antimention', 'antieveryone', 'antirole', 'badwords']
    },
    light: {
        name: 'Light',
        description: 'Basic protection - only critical filters',
        modules: ['antiinvite', 'antieveryone', 'antispam']
    }
};

/**
 * Parse duration string to milliseconds
 * @param {string} str - Duration string (e.g., '10m', '1h', '7d')
 * @returns {number} Milliseconds
 */
function parseDuration(str) {
    const match = str.match(/^(\d+)(m|h|d)$/);
    if (!match) return 10 * 60 * 1000; // Default 10 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 10 * 60 * 1000;
    }
}

/**
 * Build main wizard container
 */
function buildWizardContainer(config, disabled = false) {
    const container = new ContainerBuilder();
    const enabledModules = Object.entries(config?.modules || {}).filter(([_, m]) => m.enabled).length;
    const totalModules = Object.keys(MODULES).length;
    const activePreset = config?.activePreset || null;

    container.addTextDisplayComponents(td =>
        td.setContent(
            `${EMOJIS.automod} **AUTOMOD CONTROL CENTER**${disabled ? ' *(Expired)*' : ''}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `${disabled ? '⏰ *Session expired. Run command again.*\n\n' : ''}` +
            `${config?.enabled ? `${EMOJIS.success} **ACTIVE**` : `${EMOJIS.error} **INACTIVE**`} • ` +
            `**${enabledModules}**/${totalModules} modules • ` +
            `${config?.logChannel ? `<#${config.logChannel}>` : '*No logs*'}\n` +
            `${activePreset ? `${EMOJIS.success} Using **${activePreset.charAt(0).toUpperCase() + activePreset.slice(1)}** preset` : '*Custom configuration*'}`
        )
    );

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addTextDisplayComponents(td => td.setContent(`**QUICK PRESETS** • Select protection level`));

    const presetRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('automod_preset_strict')
            .setLabel('Strict')
            .setEmoji(EMOJIS.strict)
            .setStyle(activePreset === 'strict' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(disabled || activePreset === 'strict'),
        new ButtonBuilder()
            .setCustomId('automod_preset_moderate')
            .setLabel('Moderate')
            .setEmoji(EMOJIS.moderate)
            .setStyle(activePreset === 'moderate' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(disabled || activePreset === 'moderate'),
        new ButtonBuilder()
            .setCustomId('automod_preset_light')
            .setLabel('Light')
            .setEmoji(EMOJIS.feather)
            .setStyle(activePreset === 'light' ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(disabled || activePreset === 'light')
    );
    container.addActionRowComponents(presetRow);

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addTextDisplayComponents(td => td.setContent(`**CONFIGURATION** • Customize settings`));

    const configRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('automod_page_modules')
            .setLabel('Modules')
            .setEmoji('📦')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('automod_page_punishments')
            .setLabel('Punishments')
            .setEmoji('⚡')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('automod_page_ignore')
            .setLabel('Ignore Rules')
            .setEmoji(EMOJIS.ignorerules)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('automod_page_words')
            .setLabel('Bad Words')
            .setEmoji('🤬')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled)
    );
    container.addActionRowComponents(configRow);

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`automod_toggle_${config?.enabled ? 'off' : 'on'}`)
            .setLabel(config?.enabled ? 'Disable' : 'Enable')
            .setEmoji(config?.enabled ? EMOJIS.disabletoggle : EMOJIS.enabletoggle)
            .setStyle(config?.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('automod_logchannel')
            .setLabel('Log Channel')
            .setEmoji(EMOJIS.enabledisablelogging)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('automod_page_strikes')
            .setLabel('Strikes')
            .setEmoji('⚠️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    );
    container.addActionRowComponents(actionRow);

    return container;
}

/**
 * Build modules page container
 */
function buildModulesPage(config, disabled = false) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(td =>
        td.setContent(
            `${EMOJIS.automod} **MODULE CONFIGURATION**\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Toggle protection modules on/off`
        )
    );

    let moduleList = '';
    for (const [key, mod] of Object.entries(MODULES)) {
        const cfg = config.modules?.[key] || {};
        const status = cfg.enabled ? EMOJIS.success : EMOJIS.error;
        moduleList += `${status} **${mod.name}** • ${mod.description}\n`;
    }

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(moduleList.trim()));

    const moduleSelect = new StringSelectMenuBuilder()
        .setCustomId('automod_module_toggle')
        .setPlaceholder('Select modules to toggle...')
        .setMinValues(1)
        .setMaxValues(Object.keys(MODULES).length)
        .addOptions(
            Object.entries(MODULES).map(([key, mod]) => ({
                label: mod.name,
                value: key,
                description: config.modules?.[key]?.enabled ? '✓ Enabled' : '✗ Disabled',
                emoji: mod.emoji
            }))
        );

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addActionRowComponents(new ActionRowBuilder().addComponents(moduleSelect));

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('automod_back_main')
            .setLabel('Back')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('automod_modules_all_on')
            .setLabel('Enable All')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('automod_modules_all_off')
            .setLabel('Disable All')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    ));

    return container;
}

/**
 * Build punishments page container
 */
function buildPunishmentsPage(config, selectedModule = null, disabled = false) {
    const container = new ContainerBuilder();

    if (!selectedModule) {
        container.addTextDisplayComponents(td =>
            td.setContent(
                `⚡ **PUNISHMENT CONFIGURATION**\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Select a module to configure its punishments`
            )
        );

        let punishList = '';
        for (const [key, mod] of Object.entries(MODULES)) {
            const cfg = config.modules?.[key] || {};
            const punishments = cfg.punishments || [mod.defaultPunishment];
            punishList += `**${mod.name}** → ${punishments.join(' + ')}\n`;
        }

        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(punishList.trim()));

        const moduleSelect = new StringSelectMenuBuilder()
            .setCustomId('automod_punishment_select_module')
            .setPlaceholder('Select module to configure...')
            .addOptions(
                Object.entries(MODULES).map(([key, mod]) => ({
                    label: mod.name,
                    value: key,
                    emoji: mod.emoji
                }))
            );

        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        container.addActionRowComponents(new ActionRowBuilder().addComponents(moduleSelect));
    } else {
        const mod = MODULES[selectedModule];
        const cfg = config.modules?.[selectedModule] || {};
        const currentPunishments = cfg.punishments || [mod.defaultPunishment];

        container.addTextDisplayComponents(td =>
            td.setContent(
                `⚡ **${mod.name.toUpperCase()} PUNISHMENTS**\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Current: **${currentPunishments.join(' + ')}**\n` +
                `Select multiple punishments to combine them`
            )
        );

        const punishmentSelect = new StringSelectMenuBuilder()
            .setCustomId(`automod_punishment_set_${selectedModule}`)
            .setPlaceholder('Select punishments...')
            .setMinValues(1)
            .setMaxValues(Object.keys(PUNISHMENTS).length)
            .addOptions(
                Object.entries(PUNISHMENTS).map(([key, p]) => ({
                    label: p.name,
                    value: key,
                    description: p.description,
                    emoji: p.emoji,
                    default: currentPunishments.includes(key)
                }))
            );

        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        container.addActionRowComponents(new ActionRowBuilder().addComponents(punishmentSelect));
    }

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(selectedModule ? 'automod_page_punishments' : 'automod_back_main')
            .setLabel('Back')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    ));

    return container;
}

/**
 * Build ignore rules page container
 */
function buildIgnorePage(config, disabled = false) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(td =>
        td.setContent(
            `${EMOJIS.ignorerules} **IGNORE RULES**\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Configure channels, roles, and users to bypass automod`
        )
    );

    const globalIgnore = config.ignore || { channels: [], roles: [], users: [] };
    const ignoreCount = globalIgnore.channels.length + globalIgnore.roles.length + globalIgnore.users.length;

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td =>
        td.setContent(
            `**Global Ignores:** ${ignoreCount}\n` +
            `• Channels: ${globalIgnore.channels.length > 0 ? globalIgnore.channels.slice(0, 3).map(id => `<#${id}>`).join(', ') + (globalIgnore.channels.length > 3 ? '...' : '') : '*None*'}\n` +
            `• Roles: ${globalIgnore.roles.length > 0 ? globalIgnore.roles.slice(0, 3).map(id => `<@&${id}>`).join(', ') + (globalIgnore.roles.length > 3 ? '...' : '') : '*None*'}\n` +
            `• Users: ${globalIgnore.users.length > 0 ? globalIgnore.users.slice(0, 3).map(id => `<@${id}>`).join(', ') + (globalIgnore.users.length > 3 ? '...' : '') : '*None*'}`
        )
    );

    const typeSelect = new StringSelectMenuBuilder()
        .setCustomId('automod_ignore_type')
        .setPlaceholder('What do you want to ignore?')
        .addOptions([
            { label: 'Add Channel', value: 'add_channel', emoji: '📝', description: 'Ignore a channel globally' },
            { label: 'Add Role', value: 'add_role', emoji: '🎭', description: 'Ignore a role globally' },
            { label: 'Add User', value: 'add_user', emoji: '👤', description: 'Ignore a user globally' },
            { label: 'Per-Module Ignore', value: 'per_module', emoji: '📦', description: 'Ignore for specific module' },
            { label: 'Clear All Ignores', value: 'clear_all', emoji: '🗑️', description: 'Remove all ignore rules' }
        ]);

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addActionRowComponents(new ActionRowBuilder().addComponents(typeSelect));

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('automod_back_main')
            .setLabel('Back')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    ));

    return container;
}

/**
 * Build bad words page container
 */
function buildWordsPage(config, disabled = false) {
    const container = new ContainerBuilder();

    const words = config.modules?.badwords?.words || [];

    container.addTextDisplayComponents(td =>
        td.setContent(
            `🤬 **BAD WORDS FILTER**\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Manage banned words and phrases\n\n` +
            `**Total Words:** ${words.length}`
        )
    );

    if (words.length > 0) {
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(`**Current Words:**\n${words.slice(0, 15).map((w, i) => `\`${i + 1}\` ||${w}||`).join('\n')}${words.length > 15 ? `\n*...and ${words.length - 15} more*` : ''}`)
        );
    }

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('automod_words_add')
            .setLabel('Add Words')
            .setEmoji('➕')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('automod_words_remove')
            .setLabel('Remove')
            .setEmoji('➖')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled || words.length === 0),
        new ButtonBuilder()
            .setCustomId('automod_words_bulk_remove')
            .setLabel('Bulk Remove')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled || words.length === 0)
    ));

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('automod_back_main')
            .setLabel('Back')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('automod_words_clear')
            .setLabel('Clear All')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled || words.length === 0)
    ));

    return container;
}

/**
 * Build strikes page container
 */
function buildStrikesPage(config, disabled = false) {
    const container = new ContainerBuilder();

    const strikesEnabled = config.strikesEnabled !== false;
    const strikeActions = config.strikeActions || { 3: { action: 'mute', duration: '10m' }, 5: { action: 'mute', duration: '1h' }, 7: { action: 'kick' }, 10: { action: 'ban' } };
    const actionsText = Object.entries(strikeActions)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .map(([strikes, cfg]) => `**${strikes}** strikes → ${cfg.action}${cfg.duration ? ` (${cfg.duration})` : ''}`)
        .join('\n');

    container.addTextDisplayComponents(td =>
        td.setContent(
            `⚠️ **STRIKE SYSTEM**\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `**Status:** ${strikesEnabled ? '✅ Enabled' : '❌ Disabled'}\n\n` +
            `Strikes accumulate per user. Actions trigger at thresholds.\n\n` +
            `**Expiry:** ${config.strikeExpiry || 24} hours\n\n` +
            `**Current Actions:**\n${actionsText}`
        )
    );

    const actionSelect = new StringSelectMenuBuilder()
        .setCustomId('automod_strike_threshold')
        .setPlaceholder('Configure strike thresholds...')
        .addOptions([
            { label: '3 Strikes', value: '3', description: 'First warning level' },
            { label: '5 Strikes', value: '5', description: 'Second warning level' },
            { label: '7 Strikes', value: '7', description: 'Third warning level' },
            { label: '10 Strikes', value: '10', description: 'Maximum tolerance' },
            { label: 'Set Expiry Time', value: 'expiry', description: 'Change strike expiry hours' }
        ]);

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    container.addActionRowComponents(new ActionRowBuilder().addComponents(actionSelect));

    container.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('automod_back_main')
            .setLabel('Back')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('automod_strikes_toggle')
            .setLabel(strikesEnabled ? 'Disable Strikes' : 'Enable Strikes')
            .setEmoji(strikesEnabled ? '🔴' : '🟢')
            .setStyle(strikesEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
            .setDisabled(disabled)
    ));

    return container;
}

/**
 * Build config display container
 */
function buildConfigContainer(config) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(td => td.setContent(`# ${EMOJIS.security} Automod Configuration`));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    let moduleStatus = '';
    for (const [key, mod] of Object.entries(MODULES)) {
        const cfg = config.modules?.[key] || {};
        const status = cfg.enabled ? EMOJIS.success : EMOJIS.error;
        const punishments = cfg.punishments || [mod.defaultPunishment];
        const threshold = cfg.threshold || 1;
        moduleStatus += `${status} **${mod.name}** → ${punishments.join('+')} (${threshold})\n`;
    }

    const globalIgnore = config.ignore || { channels: [], roles: [], users: [] };
    const ignoreCount = globalIgnore.channels.length + globalIgnore.roles.length + globalIgnore.users.length;

    container.addTextDisplayComponents(td =>
        td.setContent(
            `**Status:** ${config.enabled ? `${EMOJIS.success} Enabled` : `${EMOJIS.error} Disabled`}\n` +
            `**Log Channel:** ${config.logChannel ? `<#${config.logChannel}>` : '*Not set*'}\n` +
            `**Global Ignores:** ${ignoreCount}\n\n` +
            `**Modules:**\n${moduleStatus}`
        )
    );

    return container;
}

module.exports = {
    MODULES,
    PUNISHMENTS,
    PRESETS,
    parseDuration,
    buildWizardContainer,
    buildModulesPage,
    buildPunishmentsPage,
    buildIgnorePage,
    buildWordsPage,
    buildStrikesPage,
    buildConfigContainer
};
