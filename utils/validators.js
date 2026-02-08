/**
 * Input Validation & Permission Utilities
 * Provides validation functions for user input and permission checks
 */

const { PermissionFlagsBits } = require('discord.js');
const { TICKET_CATEGORIES } = require('../config/config');

/**
 * Validate member permissions
 * @param {GuildMember} member - The guild member to check
 * @param {Array<bigint>} requiredPermissions - Array of required permission flags
 * @returns {Object} { valid: boolean, missing?: string }
 */
const validatePermissions = (member, requiredPermissions) => {
    // Administrators bypass all permission checks
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        return { valid: true };
    }

    for (const permission of requiredPermissions) {
        if (!member.permissions.has(permission)) {
            return {
                valid: false,
                missing: getPermissionName(permission)
            };
        }
    }

    return { valid: true };
};

/**
 * Validate bot permissions in a guild
 * @param {Guild} guild - The guild to check
 * @param {Array<bigint>} requiredPermissions - Array of required permission flags
 * @returns {Object} { valid: boolean, missing?: string }
 */
const validateBotPermissions = (guild, requiredPermissions) => {
    const botMember = guild.members.me;

    if (!botMember) {
        return { valid: false, missing: 'Bot member not found' };
    }

    for (const permission of requiredPermissions) {
        if (!botMember.permissions.has(permission)) {
            return {
                valid: false,
                missing: getPermissionName(permission)
            };
        }
    }

    return { valid: true };
};

/**
 * Get human-readable permission name
 * @param {bigint} permission - Permission flag
 * @returns {string} Human-readable permission name
 */
const getPermissionName = (permission) => {
    const permissionNames = {
        [PermissionFlagsBits.Administrator]: 'Administrator',
        [PermissionFlagsBits.ManageChannels]: 'Manage Channels',
        [PermissionFlagsBits.ManageGuild]: 'Manage Server',
        [PermissionFlagsBits.ManageMessages]: 'Manage Messages',
        [PermissionFlagsBits.ManageRoles]: 'Manage Roles',
        [PermissionFlagsBits.ModerateMembers]: 'Moderate Members',
        [PermissionFlagsBits.BanMembers]: 'Ban Members',
        [PermissionFlagsBits.KickMembers]: 'Kick Members',
        [PermissionFlagsBits.ViewChannel]: 'View Channel',
        [PermissionFlagsBits.SendMessages]: 'Send Messages'
    };

    return permissionNames[permission] || 'Unknown Permission';
};

/**
 * Input validation functions
 */
const validateInput = {
    /**
     * Validate channel name
     * @param {string} name - Channel name to validate
     * @returns {boolean} Whether the name is valid
     */
    channelName: (name) => {
        if (!name || typeof name !== 'string') return false;
        // Discord channel names: lowercase, no spaces, 1-100 chars, alphanumeric and hyphens
        return /^[a-z0-9-]{1,100}$/.test(name.toLowerCase());
    },

    /**
     * Validate reason string (for moderation actions)
     * @param {string} reason - Reason to validate
     * @returns {boolean} Whether the reason is valid
     */
    reason: (reason) => {
        if (!reason || typeof reason !== 'string') return false;
        return reason.length >= 1 && reason.length <= 512;
    },

    /**
     * Validate duration string (e.g., 10m, 1h, 1d)
     * @param {string} duration - Duration to validate
     * @returns {boolean} Whether the duration is valid
     */
    duration: (duration) => {
        if (!duration || typeof duration !== 'string') return false;
        return /^\d+[smhdw]$/.test(duration);
    },

    /**
     * Validate ticket category
     * @param {string} category - Category to validate
     * @returns {boolean} Whether the category is valid
     */
    ticketCategory: (category) => {
        return Object.keys(TICKET_CATEGORIES).includes(category);
    },

    /**
     * Validate hex color code
     * @param {string} color - Color to validate
     * @returns {boolean} Whether the color is valid
     */
    hexColor: (color) => {
        if (!color || typeof color !== 'string') return false;
        return /^#?[0-9A-Fa-f]{6}$/.test(color);
    },

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @returns {boolean} Whether the URL is valid
     */
    url: (url) => {
        if (!url || typeof url !== 'string') return false;
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Validate Discord snowflake ID
     * @param {string} id - ID to validate
     * @returns {boolean} Whether the ID is valid
     */
    snowflake: (id) => {
        if (!id || typeof id !== 'string') return false;
        return /^\d{17,19}$/.test(id);
    }
};

/**
 * Check if a member can moderate another member
 * @param {GuildMember} moderator - The moderator
 * @param {GuildMember} target - The target member
 * @returns {Object} { canModerate: boolean, reason?: string }
 */
const canModerate = (moderator, target) => {
    // Can't moderate yourself
    if (moderator.id === target.id) {
        return { canModerate: false, reason: 'You cannot moderate yourself' };
    }

    // Can't moderate the server owner
    if (target.id === target.guild.ownerId) {
        return { canModerate: false, reason: 'You cannot moderate the server owner' };
    }

    // Check role hierarchy
    if (moderator.roles.highest.position <= target.roles.highest.position) {
        return { canModerate: false, reason: 'Your role is not high enough to moderate this user' };
    }

    // Check if bot can moderate the target
    const botMember = target.guild.members.me;
    if (botMember.roles.highest.position <= target.roles.highest.position) {
        return { canModerate: false, reason: 'My role is not high enough to moderate this user' };
    }

    return { canModerate: true };
};

module.exports = {
    validatePermissions,
    validateBotPermissions,
    getPermissionName,
    validateInput,
    canModerate
};
