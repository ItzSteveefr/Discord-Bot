const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MESSAGES_DB_PATH = path.join(__dirname, 'messages.json');

// Read messages database
function readMessagesDatabase() {
    try {
        const data = fs.readFileSync(MESSAGES_DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {
            ticketPanel: { channelId: null, messageId: null, contentHash: null, timestamp: null }
        };
    }
}

// Write messages database
function writeMessagesDatabase(data) {
    try {
        fs.writeFileSync(MESSAGES_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('❌ Messages database write error:', error);
        return false;
    }
}

// Generate content hash
function generateContentHash(messageObject) {
    const contentString = JSON.stringify(messageObject, null, 0);
    return crypto.createHash('sha256').update(contentString).digest('hex');
}

// Get message info
function getMessageInfo(messageType) {
    const db = readMessagesDatabase();
    return db[messageType] || { channelId: null, messageId: null, contentHash: null, timestamp: null };
}

// Update message info
function updateMessageInfo(messageType, channelId, messageId, contentHash) {
    const db = readMessagesDatabase();
    db[messageType] = {
        channelId: channelId,
        messageId: messageId,
        contentHash: contentHash,
        timestamp: new Date().toISOString()
    };
    return writeMessagesDatabase(db);
}

// Check if message exists
async function checkMessageExists(client, channelId, messageId) {
    try {
        if (!channelId || !messageId) return false;

        const channel = await client.channels.fetch(channelId);
        if (!channel) return false;

        const message = await channel.messages.fetch(messageId);
        return !!message;
    } catch (error) {
        return false;
    }
}

// Delete old message
async function deleteOldMessage(client, channelId, messageId) {
    try {
        if (!channelId || !messageId) return false;

        const channel = await client.channels.fetch(channelId);
        if (!channel) return false;

        const message = await channel.messages.fetch(messageId);
        if (message) {
            await message.delete();
            console.log(`🗑️ Old message deleted: ${messageId}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Message delete error:', error);
        return false;
    }
}

// Smart message management
async function manageMessage(client, messageType, channelId, messageContent) {
    try {
        // Calculate new content hash
        const newContentHash = generateContentHash(messageContent);

        // Get old info from database
        const oldInfo = getMessageInfo(messageType);

        // Check if old message exists
        const messageExists = await checkMessageExists(client, oldInfo.channelId, oldInfo.messageId);

        // Make decision
        if (!messageExists) {
            console.log(`📤 ${messageType} message will be sent (message not found)`);
            return { action: 'send', reason: 'message_not_found' };
        }

        if (oldInfo.contentHash === newContentHash && oldInfo.channelId === channelId) {
            console.log(`⏭️ ${messageType} message skipped (content unchanged)`);
            return { action: 'skip', reason: 'content_unchanged' };
        }

        if (oldInfo.contentHash !== newContentHash) {
            console.log(`🔄 ${messageType} message will be updated (content changed)`);
            await deleteOldMessage(client, oldInfo.channelId, oldInfo.messageId);
            return { action: 'update', reason: 'content_changed' };
        }

        // Default: send new
        return { action: 'send', reason: 'default' };

    } catch (error) {
        console.error(`❌ ${messageType} message management error:`, error);
        return { action: 'send', reason: 'error' };
    }
}

module.exports = {
    readMessagesDatabase,
    writeMessagesDatabase,
    generateContentHash,
    getMessageInfo,
    updateMessageInfo,
    checkMessageExists,
    deleteOldMessage,
    manageMessage
};
