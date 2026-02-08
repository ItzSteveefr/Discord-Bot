const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'moderation.json');

// Read JSON file
function readData() {
    try {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {}; // Start with empty object
    }
}

// Write to JSON file
function writeData(data) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 4), 'utf8');
}

// Get guild moderation data
function getGuildData(guildId) {
    const data = readData();
    if (!data[guildId]) {
        data[guildId] = {
            actions: [],
            lockIgnoreChannels: [],
            cases: 0
        };
        writeData(data);
    }
    return data[guildId];
}

// Add moderation action
function addAction(guildId, action) {
    const data = readData();
    if (!data[guildId]) {
        data[guildId] = { actions: [], lockIgnoreChannels: [], cases: 0 };
    }

    const caseId = (data[guildId].cases || 0) + 1;
    data[guildId].cases = caseId;

    const newAction = {
        id: caseId,
        ...action,
        timestamp: Date.now()
    };

    data[guildId].actions.push(newAction);
    writeData(data);

    return newAction;
}

// Lock ignore channels management
function addLockIgnore(guildId, channelId) {
    const data = readData();
    if (!data[guildId]) data[guildId] = { actions: [], lockIgnoreChannels: [], cases: 0 };

    if (!data[guildId].lockIgnoreChannels.includes(channelId)) {
        data[guildId].lockIgnoreChannels.push(channelId);
        writeData(data);
        return true;
    }
    return false;
}

function removeLockIgnore(guildId, channelId) {
    const data = readData();
    if (!data[guildId] || !data[guildId].lockIgnoreChannels) return false;

    const index = data[guildId].lockIgnoreChannels.indexOf(channelId);
    if (index > -1) {
        data[guildId].lockIgnoreChannels.splice(index, 1);
        writeData(data);
        return true;
    }
    return false;
}

function getLockIgnores(guildId) {
    const data = readData();
    return data[guildId]?.lockIgnoreChannels || [];
}

module.exports = {
    getGuildData,
    addAction,
    addLockIgnore,
    removeLockIgnore,
    getLockIgnores
};
