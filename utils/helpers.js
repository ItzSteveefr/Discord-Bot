/**
 * Helper Utility Functions
 * General utility functions used throughout the bot
 */

const ms = require('ms');
const moment = require('moment');

/**
 * Parse duration string to milliseconds
 * @param {string} duration - Duration string (e.g., '10m', '1h', '1d')
 * @returns {number|null} Duration in milliseconds or null if invalid
 */
const parseDuration = (duration) => {
    try {
        const result = ms(duration);
        return result > 0 ? result : null;
    } catch {
        return null;
    }
};

/**
 * Format duration to human readable string
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Human readable duration
 */
const formatDuration = (milliseconds) => {
    if (!milliseconds || milliseconds < 0) return 'Unknown';

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
};

/**
 * Format timestamp to Discord relative time
 * @param {number|Date} timestamp - Timestamp to format
 * @returns {string} Discord timestamp format
 */
const formatTimestamp = (timestamp, style = 'R') => {
    const unix = Math.floor(new Date(timestamp).getTime() / 1000);
    return `<t:${unix}:${style}>`;
};

/**
 * Generate a random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Get a random element from an array
 * @param {Array} array - Array to pick from
 * @returns {*} Random element
 */
const randomElement = (array) => {
    if (!array || !array.length) return null;
    return array[Math.floor(Math.random() * array.length)];
};

/**
 * Truncate text to a maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add if truncated
 * @returns {string} Truncated text
 */
const truncate = (text, maxLength = 100, suffix = '...') => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert hex color to integer
 * @param {string} hex - Hex color code (with or without #)
 * @returns {number} Integer color value
 */
const hexToInt = (hex) => {
    if (!hex) return 0;
    return parseInt(hex.replace('#', ''), 16);
};

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the duration
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Chunk an array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array} Array of chunks
 */
const chunk = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

/**
 * Format date for display
 * @param {Date|number} date - Date to format
 * @param {string} format - Moment format string
 * @returns {string} Formatted date string
 */
const formatDate = (date, format = 'MMMM Do YYYY, h:mm a') => {
    return moment(date).format(format);
};

/**
 * Check if a string is a valid Discord snowflake ID
 * @param {string} id - ID to check
 * @returns {boolean} Whether the ID is valid
 */
const isValidSnowflake = (id) => {
    if (!id || typeof id !== 'string') return false;
    return /^\d{17,19}$/.test(id);
};

/**
 * Create a progress bar string
 * @param {number} current - Current value
 * @param {number} total - Total value
 * @param {number} length - Bar length in characters
 * @returns {string} Progress bar string
 */
const createProgressBar = (current, total, length = 10) => {
    const percentage = current / total;
    const filled = Math.round(length * percentage);
    const empty = length - filled;
    const filledChar = '█';
    const emptyChar = '░';
    return filledChar.repeat(filled) + emptyChar.repeat(empty);
};

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 * @param {number} n - Number
 * @returns {string} Number with ordinal suffix
 */
const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

module.exports = {
    parseDuration,
    formatDuration,
    formatTimestamp,
    randomInt,
    randomElement,
    truncate,
    capitalize,
    hexToInt,
    sleep,
    chunk,
    formatDate,
    isValidSnowflake,
    createProgressBar,
    formatNumber,
    deepClone,
    ordinal
};
