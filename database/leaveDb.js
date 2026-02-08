const fs = require('fs');
const path = require('path');

const LEAVE_COUNT_PATH = path.join(__dirname, 'leaveCount.json');

// Read leave counts
function readLeaveCounts() {
    try {
        const data = fs.readFileSync(LEAVE_COUNT_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Write leave counts
function writeLeaveCounts(data) {
    try {
        fs.writeFileSync(LEAVE_COUNT_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('❌ Leave count write error:', error);
        return false;
    }
}

// Get leave count for user
function getLeaveCount(userId) {
    const data = readLeaveCounts();
    return data[userId] || 0;
}

// Increment leave count for user
function incrementLeaveCount(userId) {
    const data = readLeaveCounts();
    data[userId] = (data[userId] || 0) + 1;
    writeLeaveCounts(data);
    return data[userId];
}

module.exports = {
    readLeaveCounts,
    writeLeaveCounts,
    getLeaveCount,
    incrementLeaveCount
};
