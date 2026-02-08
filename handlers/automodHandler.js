const { Events, ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } = require('discord.js');
const { getAutomodConfig, saveAutomodConfig, getStrikes, updateStrikes } = require('../database/automodDb');
const { MODULES, parseDuration } = require('../utils/automodUtils');
const EMOJIS = require('../utils/emojis');

// Regex patterns
const DISCORD_INVITE_REGEX = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/gi;
const URL_REGEX = /https?:\/\/[^\s<]+[^<.,:;"')\]\s]/gi;
const ZALGO_REGEX = /[\u0300-\u036f\u0489]/g;
const EVERYONE_HERE_REGEX = /@(everyone|here)/gi;

// Known spam phrases
const COPYPASTAS = [
    'did you just seriously think',
    'navy seal copypasta',
    'gorilla warfare',
    'i am trained in',
    'over 300 confirmed',
    'my dad works at',
    'unregistered hypercam',
    'free robux',
    'free nitro',
    'claim your gift',
    'steam gift',
    'discord nitro for free',
    'you have been gifted',
    'airdrop claim',
    'click here to claim'
];

// Spam tracking cache
const spamCache = new Map();

/**
 * Check if user/channel/role is ignored
 */
function isIgnored(message, config, moduleName) {
    const moduleConfig = config.modules?.[moduleName];
    if (!moduleConfig?.enabled) return true;

    // Global ignores
    if (config.ignore?.channels?.includes(message.channel.id)) return true;
    if (config.ignore?.users?.includes(message.author.id)) return true;
    if (config.ignore?.roles?.some(roleId => message.member?.roles.cache.has(roleId))) return true;

    // Per-module ignores
    if (moduleConfig.ignore?.channels?.includes(message.channel.id)) return true;
    if (moduleConfig.ignore?.roles?.some(roleId => message.member?.roles.cache.has(roleId))) return true;

    return false;
}

// Module check functions
const checkAntiInvite = (message) => DISCORD_INVITE_REGEX.test(message.content);

const checkAntiLink = (message) => {
    const urls = message.content.match(URL_REGEX);
    if (!urls) return false;
    return urls.some(url => !url.includes('discord.com') && !url.includes('discord.gg'));
};

const checkAntiSpam = (message, config) => {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const window = (config.modules.antispam?.window || 5) * 1000;
    const threshold = config.modules.antispam?.threshold || 5;

    if (!spamCache.has(key)) {
        spamCache.set(key, []);
    }

    const timestamps = spamCache.get(key);
    timestamps.push({ time: now, content: message.content });

    const recentMessages = timestamps.filter(t => now - t.time < window);
    spamCache.set(key, recentMessages);

    if (recentMessages.length >= threshold) return true;

    // Check for duplicate messages
    const duplicates = recentMessages.filter(t => t.content === message.content);
    return duplicates.length >= 3;
};

const checkAntiCaps = (message, config) => {
    const text = message.content.replace(/[^a-zA-Z]/g, '');
    if (text.length < 8) return false;

    const capsCount = (text.match(/[A-Z]/g) || []).length;
    const capsPercentage = (capsCount / text.length) * 100;
    const threshold = config.modules.anticaps?.threshold || 70;

    return capsPercentage >= threshold;
};

const checkAntiMention = (message, config) => {
    const threshold = config.modules.antimention?.threshold || 5;
    return message.mentions.users.size >= threshold;
};

const checkAntiEmoji = (message, config) => {
    const threshold = config.modules.antiemoji?.threshold || 10;
    const customEmojis = (message.content.match(/<a?:\w+:\d+>/g) || []).length;
    const unicodeEmojis = (message.content.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
    return (customEmojis + unicodeEmojis) >= threshold;
};

const checkBadWords = (message, config) => {
    const words = config.modules.badwords?.words || [];
    if (!words.length) return false;

    const content = message.content.toLowerCase();
    return words.some(word => content.includes(word.toLowerCase()));
};

const checkMaxLines = (message, config) => {
    const threshold = config.modules.maxlines?.threshold || 15;
    return message.content.split('\n').length > threshold;
};

const checkAntiEveryone = (message, config) => {
    if (message.member?.permissions.has(PermissionFlagsBits.MentionEveryone)) return false;
    if (EVERYONE_HERE_REGEX.test(message.content)) return true;

    const moduleConfig = config.modules.antieveryone;
    const threshold = moduleConfig?.threshold || 5;
    const usePercent = moduleConfig?.usePercent !== false;
    const serverMembers = message.guild.memberCount;
    const minMembers = usePercent ? Math.ceil(serverMembers * (threshold / 100)) : threshold;

    for (const [, role] of message.mentions.roles) {
        if (role.members.size >= minMembers) return true;
    }
    return false;
};

const checkAntiRole = (message, config) => {
    const moduleConfig = config.modules.antirole;
    const threshold = moduleConfig?.threshold || 5;
    const usePercent = moduleConfig?.usePercent !== false;
    const serverMembers = message.guild.memberCount;
    const minMembers = usePercent ? Math.ceil(serverMembers * (threshold / 100)) : threshold;

    if (!message.mentions.roles.size) return false;

    for (const [, role] of message.mentions.roles) {
        if (role.members.size >= minMembers) return true;
    }
    return false;
};

const checkAntiZalgo = (message) => {
    const zalgoChars = message.content.match(ZALGO_REGEX);
    return zalgoChars && zalgoChars.length > 10;
};

const checkAntiNewlines = (message, config) => {
    const threshold = config.modules.antinewlines?.threshold || 5;
    const blankLines = (message.content.match(/\n\s*\n/g) || []).length;
    return blankLines >= threshold;
};

const checkAntiCopypasta = (message) => {
    const content = message.content.toLowerCase();
    return COPYPASTAS.some(pasta => content.includes(pasta));
};

// Module checks mapping
const MODULE_CHECKS = {
    antiinvite: { check: checkAntiInvite, violation: 'Discord invite links are not allowed here.' },
    antilink: { check: checkAntiLink, violation: 'Links are not allowed in this channel.' },
    antispam: { check: checkAntiSpam, violation: 'Please slow down! No spamming.' },
    anticaps: { check: checkAntiCaps, violation: 'Please avoid using excessive CAPS.' },
    antimention: { check: checkAntiMention, violation: 'Too many mentions in one message.' },
    antiemoji: { check: checkAntiEmoji, violation: 'Too many emojis in one message.' },
    badwords: { check: checkBadWords, violation: 'Your message contained a banned word.' },
    maxlines: { check: checkMaxLines, violation: 'Your message was too long.' },
    antieveryone: { check: checkAntiEveryone, violation: 'You cannot use @everyone or @here.' },
    antirole: { check: checkAntiRole, violation: 'You cannot mass ping roles.' },
    antizalgo: { check: checkAntiZalgo, violation: 'Zalgo/glitchy text is not allowed.' },
    antinewlines: { check: checkAntiNewlines, violation: 'Too many blank lines in your message.' },
    anticopypasta: { check: checkAntiCopypasta, violation: 'Spam content is not allowed.' }
};

/**
 * Apply punishment to user
 */
async function applyPunishment(message, config, moduleName, violation) {
    const moduleConfig = config.modules[moduleName];
    let punishments = moduleConfig?.punishments || ['delete'];
    const moduleStrikes = moduleConfig?.strikes ?? 0;

    if (!Array.isArray(punishments)) {
        punishments = [punishments];
    }

    try {
        // Delete message if applicable
        const shouldDelete = punishments.some(p => ['delete', 'warn', 'mute', 'kick', 'ban'].includes(p));
        if (shouldDelete && message.deletable) {
            await message.delete().catch(() => { });
        }

        // Process strikes if enabled
        if (moduleStrikes > 0 && config.strikesEnabled !== false) {
            const guildId = message.guild.id;
            const userId = message.author.id;
            const currentStrikes = getStrikes(guildId, userId);

            // Check expiry
            const expiryHours = config.strikeExpiry || 24;
            const expiryMs = expiryHours * 60 * 60 * 1000;
            let newCount = currentStrikes.count;

            if (currentStrikes.lastStrike && Date.now() - currentStrikes.lastStrike > expiryMs) {
                newCount = 0; // Reset expired strikes
            }

            newCount += moduleStrikes;

            updateStrikes(guildId, userId, newCount, {
                time: Date.now(),
                amount: moduleStrikes,
                reason: `${moduleName}: ${violation}`,
                module: moduleName
            });

            // Check strike thresholds
            const strikeActions = config.strikeActions || { 3: { action: 'mute', duration: '10m' }, 5: { action: 'mute', duration: '1h' }, 7: { action: 'kick' }, 10: { action: 'ban' } };

            for (const [threshold, actionConfig] of Object.entries(strikeActions).sort((a, b) => parseInt(b[0]) - parseInt(a[0]))) {
                if (newCount >= parseInt(threshold)) {
                    await applyStrikeAction(message, actionConfig, newCount);
                    break;
                }
            }
        }

        // Apply punishments
        for (const punishment of punishments) {
            if (punishment === 'mute') {
                if (message.member?.moderatable) {
                    await message.member.timeout(10 * 60 * 1000, `Automod: ${violation}`).catch(() => { });
                }
            }

            if (punishment === 'kick') {
                if (message.member?.kickable) {
                    await message.member.kick(`Automod: ${violation}`).catch(() => { });
                }
            }

            if (punishment === 'ban') {
                if (message.member?.bannable) {
                    await message.member.ban({ reason: `Automod: ${violation}`, deleteMessageSeconds: 86400 }).catch(() => { });
                }
            }

            if (punishment === 'protocol') {
                if (message.member?.moderatable) {
                    const memberRoles = message.member.roles.cache
                        .filter(r => r.id !== message.guild.id && r.position < message.guild.members.me.roles.highest.position)
                        .map(r => r.id);

                    if (memberRoles.length > 0) {
                        await message.member.roles.remove(memberRoles, `Automod Protocol: ${violation}`).catch(() => { });
                    }
                    await message.member.timeout(28 * 24 * 60 * 60 * 1000, `Automod Protocol: ${violation}`).catch(() => { });
                }
            }
        }

        // Log violation
        const strikeInfo = moduleStrikes > 0 ? ` (+${moduleStrikes} strike${moduleStrikes > 1 ? 's' : ''})` : '';
        await logViolation(message, config, moduleName, violation, punishments.join(' + ') + strikeInfo);

        // Notify user if enabled
        if (config.notifyUser !== false) {
            try {
                const warningMsg = await message.channel.send({
                    content: `<@${message.author.id}> ${violation}`,
                    allowedMentions: { users: [message.author.id] }
                });
                // Auto-delete warning after 5 seconds
                setTimeout(() => warningMsg.delete().catch(() => { }), 5000);
            } catch (e) {
                console.error('[Automod] Failed to send warning:', e.message);
            }
        }
    } catch (error) {
        console.error(`[Automod] Error applying punishment:`, error);
    }
}

/**
 * Apply strike threshold action
 */
async function applyStrikeAction(message, actionConfig, totalStrikes) {
    try {
        if (actionConfig.action === 'mute') {
            const duration = parseDuration(actionConfig.duration || '10m');
            if (message.member?.moderatable) {
                await message.member.timeout(duration, `Automod: ${totalStrikes} strikes reached`).catch(() => { });
            }
        } else if (actionConfig.action === 'kick') {
            if (message.member?.kickable) {
                await message.member.kick(`Automod: ${totalStrikes} strikes reached`).catch(() => { });
            }
        } else if (actionConfig.action === 'ban') {
            if (message.member?.bannable) {
                await message.member.ban({ reason: `Automod: ${totalStrikes} strikes reached`, deleteMessageSeconds: 86400 }).catch(() => { });
            }
        }
    } catch (error) {
        console.error(`[Automod] Error applying strike action:`, error);
    }
}

/**
 * Log violation to log channel
 */
async function logViolation(message, config, moduleName, violation, punishment) {
    if (!config.logChannel) return;

    const channel = message.guild.channels.cache.get(config.logChannel);
    if (!channel) return;

    try {
        const container = new ContainerBuilder();
        container.addTextDisplayComponents(td =>
            td.setContent(`# ${EMOJIS.security} Automod Violation`)
        );
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td =>
            td.setContent(
                `**User:** ${message.author.tag} (${message.author.id})\n` +
                `**Channel:** <#${message.channel.id}>\n` +
                `**Module:** ${MODULES[moduleName]?.name || moduleName}\n` +
                `**Violation:** ${violation}\n` +
                `**Action:** ${punishment}\n` +
                `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
            )
        );

        if (message.content && message.content.length < 1000) {
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));
            container.addTextDisplayComponents(td =>
                td.setContent(`**Message Content:**\n\`\`\`${message.content.substring(0, 900)}\`\`\``)
            );
        }

        await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
        console.error(`[Automod] Error logging violation:`, error);
    }
}

/**
 * Register automod handler
 */
function registerAutomodHandler(client) {
    client.on(Events.MessageCreate, async (message) => {
        // Skip bots and DMs
        if (!message.guild || message.author.bot) return;
        if (!message.member) return;

        // Skip admins and moderators
        if (message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

        const config = getAutomodConfig(message.guild.id);
        if (!config?.enabled) return;

        // Run all module checks
        for (const [moduleName, { check, violation }] of Object.entries(MODULE_CHECKS)) {
            if (isIgnored(message, config, moduleName)) continue;

            try {
                const triggered = await check(message, config);
                if (triggered) {
                    await applyPunishment(message, config, moduleName, violation);
                    break; // Only trigger one module per message
                }
            } catch (error) {
                console.error(`[Automod] Error in ${moduleName} check:`, error);
            }
        }
    });

    // Cleanup spam cache periodically
    setInterval(() => {
        const now = Date.now();
        for (const [key, timestamps] of spamCache.entries()) {
            const filtered = timestamps.filter(t => now - t.time < 60000);
            if (filtered.length === 0) {
                spamCache.delete(key);
            } else {
                spamCache.set(key, filtered);
            }
        }
    }, 60000);

    console.log('✅ Automod handler registered');
}

module.exports = registerAutomodHandler;
