const Database = require('better-sqlite3');
const path = require('path');

// Initialize SQLite database
const dbPath = path.join(__dirname, 'automod.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS automod_config (
        guild_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 0,
        log_channel TEXT,
        notify_user INTEGER DEFAULT 1,
        strike_expiry INTEGER DEFAULT 24,
        strikes_enabled INTEGER DEFAULT 1,
        active_preset TEXT,
        config_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS automod_strikes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        last_strike INTEGER,
        history_json TEXT,
        UNIQUE(guild_id, user_id)
    );
`);

// Default configuration for all modules
const getDefaultConfig = () => ({
    enabled: false,
    logChannel: null,
    modules: {
        antiinvite: { enabled: false, punishments: ['delete'], strikes: 1, threshold: 1, ignore: { channels: [], roles: [] } },
        antilink: { enabled: false, punishments: ['delete'], strikes: 1, threshold: 1, ignore: { channels: [], roles: [] } },
        antispam: { enabled: false, punishments: ['warn'], strikes: 1, threshold: 5, window: 5, ignore: { channels: [], roles: [] } },
        anticaps: { enabled: false, punishments: ['delete'], strikes: 0, threshold: 70, ignore: { channels: [], roles: [] } },
        antimention: { enabled: false, punishments: ['warn'], strikes: 2, threshold: 5, ignore: { channels: [], roles: [] } },
        antiemoji: { enabled: false, punishments: ['delete'], strikes: 0, threshold: 10, ignore: { channels: [], roles: [] } },
        badwords: { enabled: false, punishments: ['delete'], strikes: 1, words: [], ignore: { channels: [], roles: [] } },
        maxlines: { enabled: false, punishments: ['delete'], strikes: 0, threshold: 15, ignore: { channels: [], roles: [] } },
        antieveryone: { enabled: false, punishments: ['delete'], strikes: 2, threshold: 5, usePercent: true, ignore: { channels: [], roles: [] } },
        antirole: { enabled: false, punishments: ['warn'], strikes: 2, threshold: 5, usePercent: true, ignore: { channels: [], roles: [] } },
        antizalgo: { enabled: false, punishments: ['delete'], strikes: 0, ignore: { channels: [], roles: [] } },
        antinewlines: { enabled: false, punishments: ['delete'], strikes: 0, threshold: 5, ignore: { channels: [], roles: [] } },
        anticopypasta: { enabled: false, punishments: ['delete'], strikes: 2, ignore: { channels: [], roles: [] } },
        antiai: { enabled: false, punishments: ['delete'], strikes: 1, ignore: { channels: [], roles: [] } }
    },
    ignore: { channels: [], roles: [], users: [] },
    notifyUser: true,
    strikesEnabled: true,
    strikeActions: {
        3: { action: 'mute', duration: '10m' },
        5: { action: 'mute', duration: '1h' },
        7: { action: 'kick' },
        10: { action: 'ban' }
    },
    strikeExpiry: 24,
    activePreset: null
});

/**
 * Get automod configuration for a guild
 * @param {string} guildId
 * @returns {object} Configuration object
 */
function getAutomodConfig(guildId) {
    const stmt = db.prepare('SELECT * FROM automod_config WHERE guild_id = ?');
    const row = stmt.get(guildId);

    if (!row) {
        return getDefaultConfig();
    }

    try {
        const config = JSON.parse(row.config_json);
        // Merge with defaults to ensure all fields exist
        const defaults = getDefaultConfig();
        return {
            ...defaults,
            ...config,
            modules: {
                ...defaults.modules,
                ...(config.modules || {})
            }
        };
    } catch (e) {
        console.error('[AutomodDB] Error parsing config:', e);
        return getDefaultConfig();
    }
}

/**
 * Save automod configuration for a guild
 * @param {string} guildId
 * @param {object} config
 */
function saveAutomodConfig(guildId, config) {
    const stmt = db.prepare(`
        INSERT INTO automod_config (guild_id, enabled, log_channel, notify_user, strike_expiry, strikes_enabled, active_preset, config_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET
            enabled = excluded.enabled,
            log_channel = excluded.log_channel,
            notify_user = excluded.notify_user,
            strike_expiry = excluded.strike_expiry,
            strikes_enabled = excluded.strikes_enabled,
            active_preset = excluded.active_preset,
            config_json = excluded.config_json
    `);

    stmt.run(
        guildId,
        config.enabled ? 1 : 0,
        config.logChannel || null,
        config.notifyUser !== false ? 1 : 0,
        config.strikeExpiry || 24,
        config.strikesEnabled !== false ? 1 : 0,
        config.activePreset || null,
        JSON.stringify(config)
    );
}

/**
 * Get user strikes for a guild
 * @param {string} guildId
 * @param {string} userId
 * @returns {object} Strike data
 */
function getStrikes(guildId, userId) {
    const stmt = db.prepare('SELECT * FROM automod_strikes WHERE guild_id = ? AND user_id = ?');
    const row = stmt.get(guildId, userId);

    if (!row) {
        return { count: 0, lastStrike: null, history: [] };
    }

    return {
        count: row.count || 0,
        lastStrike: row.last_strike,
        history: row.history_json ? JSON.parse(row.history_json) : []
    };
}

/**
 * Update user strikes
 * @param {string} guildId
 * @param {string} userId
 * @param {number} count - New total count
 * @param {object} historyEntry - New history entry to add
 */
function updateStrikes(guildId, userId, count, historyEntry = null) {
    const current = getStrikes(guildId, userId);
    const history = current.history || [];

    if (historyEntry) {
        history.push(historyEntry);
        // Keep only last 50 entries
        while (history.length > 50) history.shift();
    }

    const stmt = db.prepare(`
        INSERT INTO automod_strikes (guild_id, user_id, count, last_strike, history_json)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET
            count = excluded.count,
            last_strike = excluded.last_strike,
            history_json = excluded.history_json
    `);

    stmt.run(guildId, userId, count, Date.now(), JSON.stringify(history));
}

/**
 * Clear all strikes for a user
 * @param {string} guildId
 * @param {string} userId
 */
function clearStrikes(guildId, userId) {
    const stmt = db.prepare('DELETE FROM automod_strikes WHERE guild_id = ? AND user_id = ?');
    stmt.run(guildId, userId);
}

/**
 * Reset automod configuration to defaults
 * @param {string} guildId
 */
function resetAutomodConfig(guildId) {
    const defaultConfig = getDefaultConfig();
    saveAutomodConfig(guildId, defaultConfig);

    // Also clear all strikes for the guild
    const stmt = db.prepare('DELETE FROM automod_strikes WHERE guild_id = ?');
    stmt.run(guildId);
}

module.exports = {
    getDefaultConfig,
    getAutomodConfig,
    saveAutomodConfig,
    getStrikes,
    updateStrikes,
    clearStrikes,
    resetAutomodConfig
};
