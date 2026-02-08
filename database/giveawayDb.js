const fs = require('fs');
const path = require('path');

const giveawaysPath = path.join(__dirname, 'giveaways.json');

// Read JSON file
function readGiveaways() {
    try {
        const data = fs.readFileSync(giveawaysPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { guilds: {} };
    }
}

// Write to JSON file
function writeGiveaways(data) {
    fs.writeFileSync(giveawaysPath, JSON.stringify(data, null, 4), 'utf8');
}

// Get guild data or create if not exists
function getGuildData(guildId) {
    const data = readGiveaways();
    if (!data.guilds[guildId]) {
        data.guilds[guildId] = { giveaways: [] };
        writeGiveaways(data);
    }
    return data.guilds[guildId];
}

// Create new giveaway
function createGiveaway(guildId, giveaway) {
    const data = readGiveaways();
    if (!data.guilds[guildId]) {
        data.guilds[guildId] = { giveaways: [] };
    }
    data.guilds[guildId].giveaways.push(giveaway);
    writeGiveaways(data);
    return giveaway;
}

// Get giveaway by message ID
function getGiveaway(guildId, messageId) {
    const guildData = getGuildData(guildId);
    return guildData.giveaways.find(g => g.messageId === messageId) || null;
}

// Get giveaway by giveaway ID
function getGiveawayById(guildId, giveawayId) {
    const guildData = getGuildData(guildId);
    return guildData.giveaways.find(g => g.giveawayId === giveawayId || g.messageId === giveawayId) || null;
}

// Get all giveaways for a guild
function getAllGiveaways(guildId) {
    const guildData = getGuildData(guildId);
    return guildData.giveaways || [];
}

// Get all active giveaways across all guilds (for bot restart)
function getAllActiveGiveaways() {
    const data = readGiveaways();
    const active = [];
    for (const guildId of Object.keys(data.guilds)) {
        const giveaways = data.guilds[guildId].giveaways || [];
        for (const giveaway of giveaways) {
            if (!giveaway.ended) {
                active.push({ ...giveaway, guildId });
            }
        }
    }
    return active;
}

// Update giveaway
function updateGiveaway(guildId, giveaway) {
    const data = readGiveaways();
    if (!data.guilds[guildId]) return null;
    
    const idx = data.guilds[guildId].giveaways.findIndex(g => g.messageId === giveaway.messageId);
    if (idx >= 0) {
        data.guilds[guildId].giveaways[idx] = giveaway;
        writeGiveaways(data);
        return giveaway;
    }
    return null;
}

// Delete giveaway
function deleteGiveaway(guildId, messageId) {
    const data = readGiveaways();
    if (!data.guilds[guildId]) return false;
    
    const idx = data.guilds[guildId].giveaways.findIndex(g => g.messageId === messageId);
    if (idx >= 0) {
        data.guilds[guildId].giveaways.splice(idx, 1);
        writeGiveaways(data);
        return true;
    }
    return false;
}

// Add entry to giveaway
function addEntry(guildId, messageId, userId) {
    const giveaway = getGiveaway(guildId, messageId);
    if (!giveaway) return null;
    
    if (!giveaway.entries.includes(userId)) {
        giveaway.entries.push(userId);
        updateGiveaway(guildId, giveaway);
    }
    return giveaway;
}

// Remove entry from giveaway
function removeEntry(guildId, messageId, userId) {
    const giveaway = getGiveaway(guildId, messageId);
    if (!giveaway) return null;
    
    const idx = giveaway.entries.indexOf(userId);
    if (idx >= 0) {
        giveaway.entries.splice(idx, 1);
        updateGiveaway(guildId, giveaway);
    }
    return giveaway;
}

// Toggle entry (join/leave)
function toggleEntry(guildId, giveawayId, userId) {
    const giveaway = getGiveawayById(guildId, giveawayId);
    if (!giveaway) return { giveaway: null, action: null };
    
    const idx = giveaway.entries.indexOf(userId);
    let action;
    
    if (idx >= 0) {
        giveaway.entries.splice(idx, 1);
        action = 'left';
    } else {
        giveaway.entries.push(userId);
        action = 'joined';
    }
    
    updateGiveaway(guildId, giveaway);
    return { giveaway, action };
}

// End giveaway and set winners
function endGiveaway(guildId, messageId, winners) {
    const giveaway = getGiveaway(guildId, messageId);
    if (!giveaway) return null;
    
    giveaway.ended = true;
    giveaway.winners = winners;
    updateGiveaway(guildId, giveaway);
    return giveaway;
}

module.exports = {
    readGiveaways,
    writeGiveaways,
    createGiveaway,
    getGiveaway,
    getGiveawayById,
    getAllGiveaways,
    getAllActiveGiveaways,
    updateGiveaway,
    deleteGiveaway,
    addEntry,
    removeEntry,
    toggleEntry,
    endGiveaway
};
