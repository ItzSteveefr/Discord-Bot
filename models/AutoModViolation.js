/**
 * AutoMod Violation Model
 * Tracks AutoMod rule violations
 */

const mongoose = require('mongoose');

const autoModViolationSchema = new mongoose.Schema({
    // User who violated
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

    // Channel where violation occurred
    channelId: String,

    // Type of rule triggered
    ruleType: {
        type: String,
        required: true,
        enum: ['keyword', 'spam', 'mention_spam', 'harmful_link', 'other']
    },

    // The content that triggered the rule
    content: String,

    // Action taken
    action: {
        type: String,
        enum: ['block_message', 'alert', 'timeout', 'none'],
        default: 'block_message'
    },

    // Timestamp
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Compound indexes
autoModViolationSchema.index({ guildId: 1, timestamp: -1 });
autoModViolationSchema.index({ userId: 1, guildId: 1, timestamp: -1 });

// Set TTL to automatically delete old records after 90 days
autoModViolationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

// Static method to get violation count for a user
autoModViolationSchema.statics.getViolationCount = async function (userId, guildId, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return await this.countDocuments({
        userId,
        guildId,
        timestamp: { $gte: since }
    });
};

// Static method to get statistics
autoModViolationSchema.statics.getStatistics = async function (guildId, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const stats = await this.aggregate([
        {
            $match: {
                guildId,
                timestamp: { $gte: since }
            }
        },
        {
            $group: {
                _id: '$ruleType',
                count: { $sum: 1 }
            }
        }
    ]);

    const result = {
        keyword: 0,
        spam: 0,
        mention_spam: 0,
        harmful_link: 0,
        other: 0,
        total: 0
    };

    stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
    });

    return result;
};

// Static method to get top violators
autoModViolationSchema.statics.getTopViolators = async function (guildId, limit = 10, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return await this.aggregate([
        {
            $match: {
                guildId,
                timestamp: { $gte: since }
            }
        },
        {
            $group: {
                _id: '$userId',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: limit }
    ]).then(results => results.map(r => ({
        userId: r._id,
        count: r.count
    })));
};

module.exports = mongoose.model('AutoModViolation', autoModViolationSchema);
