const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'warnings.json');

// Ensure DB file exists
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}, null, 4), 'utf8');
}

function readData() {
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (err) {
        console.error('Error reading warnings database:', err);
        return {};
    }
}

function writeData(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 4), 'utf8');
        return true;
    } catch (err) {
        console.error('Error writing warnings database:', err);
        return false;
    }
}

/**
 * Add a warning to a user
 * @param {string} guildId 
 * @param {string} userId 
 * @param {string} moderatorId 
 * @param {string} reason 
 * @returns {object} The created warning object
 */
function addWarning(guildId, userId, moderatorId, reason) {
    const data = readData();

    if (!data[guildId]) data[guildId] = {};
    if (!data[guildId][userId]) data[guildId][userId] = [];

    const warning = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        guildId,
        userId,
        moderatorId,
        reason,
        timestamp: Date.now(),
        active: true
    };

    data[guildId][userId].push(warning);
    writeData(data);
    return warning;
}

/**
 * Get active warnings for a user
 * @param {string} guildId 
 * @param {string} userId 
 * @returns {Array} List of active warnings
 */
function getWarnings(guildId, userId) {
    const data = readData();
    if (!data[guildId] || !data[guildId][userId]) return [];

    return data[guildId][userId].filter(w => w.active).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get active warning count for a user
 * @param {string} guildId 
 * @param {string} userId 
 * @returns {number} Count of active warnings
 */
function getWarningCount(guildId, userId) {
    const warnings = getWarnings(guildId, userId);
    return warnings.length;
}

/**
 * Clear all active warnings for a user
 * @param {string} guildId 
 * @param {string} userId 
 * @param {string} moderatorId 
 * @returns {number} Number of warnings cleared
 */
function clearWarnings(guildId, userId, moderatorId) {
    const data = readData();

    if (!data[guildId] || !data[guildId][userId]) return 0;

    let clearedCount = 0;
    data[guildId][userId].forEach(w => {
        if (w.active) {
            w.active = false;
            w.clearedBy = moderatorId;
            w.clearedAt = Date.now();
            clearedCount++;
        }
    });

    if (clearedCount > 0) {
        writeData(data);
    }

    return clearedCount;
}

module.exports = {
    addWarning,
    getWarnings,
    getWarningCount,
    clearWarnings
};
