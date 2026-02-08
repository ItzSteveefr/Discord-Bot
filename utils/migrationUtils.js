const { PermissionFlagsBits } = require('discord.js');

/**
 * Migration Utilities
 * Ported/Adapted from Ares bot
 */

const EMOJIS = {
    ping: '🏓',
    members: '👥',
    users: '👤',
    bot: '🤖',
    refresh: '🔄',
    error: '❌',
    banned: '🔨',
    loading: '⏳'
};

const getModerationPermissionErrors = {
    'administrator': 'You need Administrator permissions.',
    'manage_guild': 'You need Manage Server permissions.',
    'ban_members': 'You need Ban Members permissions.',
    'kick_members': 'You need Kick Members permissions.',
    'moderate_members': 'You need Moderate Members permissions.',
    'manage_messages': 'You need Manage Messages permissions.',
    'higher_role': 'You cannot moderate this user because they have a higher or equal role.',
    'owner': 'You cannot moderate the server owner.',
    'self': 'You cannot moderate yourself.',
    'bot': 'I cannot moderate this user (higher role or is me).',
};

const ModerationPermissions = {
    validatePermission: async (executor, target, client, guildId, type = 'mod') => {
        // Self check
        if (executor.id === target.id) return { allowed: false, reason: 'self' };

        // Owner check
        if (target.id === executor.guild.ownerId) return { allowed: false, reason: 'owner' };

        // Hierarchy check
        if (target.roles && target.roles.highest && executor.roles.highest) {
            if (target.roles.highest.position >= executor.roles.highest.position) {
                if (executor.id !== executor.guild.ownerId) return { allowed: false, reason: 'higher_role' };
            }
        }

        // Permission check based on type
        if (type === 'ban') {
            if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) return { allowed: false, reason: 'ban_members' };
        }

        return { allowed: true };
    }
};

async function parseUserInput(input, guild, client) {
    if (!input) return null;

    // ID check
    if (input.match(/^\d{17,19}$/)) {
        try {
            return await guild.members.fetch(input).catch(() => client.users.fetch(input));
        } catch {
            return null;
        }
    }

    // Mention check
    const mentionMatch = input.match(/^<@!?(\d{17,19})>$/);
    if (mentionMatch) {
        try {
            return await guild.members.fetch(mentionMatch[1]).catch(() => client.users.fetch(mentionMatch[1]));
        } catch {
            return null;
        }
    }

    return null;
}

function formatUserDisplay(user) {
    if (!user) return 'Unknown User';
    return `${user.username} (${user.id})`;
}

module.exports = {
    EMOJIS,
    ModerationPermissions,
    getModerationPermissionErrors,
    parseUserInput,
    formatUserDisplay
};
