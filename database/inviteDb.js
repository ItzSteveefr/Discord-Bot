const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'invites.json');

// Read JSON file
function readData() {
    try {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {}; // Return empty object if file doesn't exist or error
    }
}

// Write to JSON file
function writeData(data) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 4), 'utf8');
}

// Get user invites
function getUserInvites(guildId, userId) {
    const data = readData();
    if (!data[guildId]) return null;
    return data[guildId][userId] || null;
}

// Update user invites
function updateUserInvites(guildId, userId, inviteData) {
    const data = readData();
    if (!data[guildId]) data[guildId] = {};

    data[guildId][userId] = {
        ...inviteData,
        lastUpdated: Date.now()
    };

    writeData(data);
    return data[guildId][userId];
}

module.exports = {
    getUserInvites,
    updateUserInvites
};
