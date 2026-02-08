/**
 * Warning Model
 * Stores moderation warnings
 */

const mongoose = require('mongoose');

const warningSchema = new mongoose.Schema({
    // Target user
    userId: {
        type: String,
        required: true,
        index: true
    },

    // Guild
    guildId: {
        type: String,
        required: true,
        index: true
    },

    // Moderator who issued the warning
    moderatorId: {
        type: String,
        required: true
    },
    moderatorName: String,

    // Warning details
    reason: {
        type: String,
        required: true,
        maxlength: 512
    },

    // Timestamp
    timestamp: {
        type: Date,
        default: Date.now
    },

    // Active status (warnings can be cleared)
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound index for user warnings per guild
warningSchema.index({ userId: 1, guildId: 1, active: 1 });
warningSchema.index({ guildId: 1, timestamp: -1 });

// Static method to get warning count
warningSchema.statics.getCount = async function (userId, guildId) {
    return await this.countDocuments({ userId, guildId, active: true });
};

// Static method to get all warnings for a user
warningSchema.statics.getWarnings = async function (userId, guildId) {
    return await this.find({ userId, guildId, active: true })
        .sort({ timestamp: -1 });
};

// Static method to clear all warnings for a user
warningSchema.statics.clearWarnings = async function (userId, guildId) {
    return await this.updateMany(
        { userId, guildId, active: true },
        { $set: { active: false } }
    );
};

// Static method to add a warning
warningSchema.statics.addWarning = async function (data) {
    return await this.create(data);
};

module.exports = mongoose.model('Warning', warningSchema);
