const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'embedDrafts.json');

function readData() {
    try {
        if (!fs.existsSync(dataPath)) {
            fs.writeFileSync(dataPath, '{}', 'utf8');
            return {};
        }
        return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (error) {
        console.error('Error reading embed drafts:', error);
        return {};
    }
}

function writeData(data) {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error('Error writing embed drafts:', error);
    }
}

function getDraft(userId) {
    const data = readData();
    return data[userId] || {
        title: null,
        description: null,
        color: null,
        image: null,
        thumbnail: null,
        footer: null,
        author: null,
        fields: [],
        timestamp: false
    };
}

function saveDraft(userId, draftData) {
    const data = readData();
    data[userId] = draftData;
    writeData(data);
}

function clearDraft(userId) {
    const data = readData();
    if (data[userId]) {
        delete data[userId];
        writeData(data);
    }
}

module.exports = {
    getDraft,
    saveDraft,
    clearDraft
};
