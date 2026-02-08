/**
 * Ticket Model
 * Stores ticket information including messages and status
 */

const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    // Unique ticket number
    ticketNumber: {
        type: Number,
        required: true,
        unique: true
    },

    // Guild information
    guildId: {
        type: String,
        required: true,
        index: true
    },

    // User who created the ticket
    userId: {
        type: String,
        required: true,
        index: true
    },
    username: String,

    // Ticket channel
    channelId: {
        type: String,
        required: true,
        unique: true
    },

    // Ticket category
    category: {
        type: String,
        required: true,
        enum: ['plugin_support', 'purchase_issue', 'technical_help', 'general']
    },

    // Ticket status
    status: {
        type: String,
        enum: ['open', 'claimed', 'closed'],
        default: 'open',
        index: true
    },

    // Staff who claimed the ticket
    claimedBy: String,
    claimedAt: Date,

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    closedAt: Date,
    closedBy: String,
    closeReason: String,

    // Transcript
    transcriptUrl: String,

    // Messages log (limited to last 100)
    messages: [{
        authorId: String,
        authorName: String,
        content: String,
        timestamp: { type: Date, default: Date.now },
        attachments: [String]
    }],

    // Feedback
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    feedback: String,

    // Additional users with access
    addedUsers: [String]
}, {
    timestamps: true
});

// Index for efficient queries
ticketSchema.index({ guildId: 1, status: 1 });
ticketSchema.index({ guildId: 1, createdAt: -1 });
ticketSchema.index({ userId: 1, guildId: 1 });

// Static method to get next ticket number
ticketSchema.statics.getNextTicketNumber = async function (guildId) {
    const lastTicket = await this.findOne({ guildId })
        .sort({ ticketNumber: -1 })
        .select('ticketNumber');

    return lastTicket ? lastTicket.ticketNumber + 1 : 1;
};

// Static method to get ticket statistics
ticketSchema.statics.getStatistics = async function (guildId) {
    const stats = await this.aggregate([
        { $match: { guildId } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                open: {
                    $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
                },
                claimed: {
                    $sum: { $cond: [{ $eq: ['$status', 'claimed'] }, 1, 0] }
                },
                closed: {
                    $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
                }
            }
        }
    ]);

    // Get category breakdown
    const categoryStats = await this.aggregate([
        { $match: { guildId } },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 }
            }
        }
    ]);

    const categories = {};
    categoryStats.forEach(cat => {
        categories[cat._id] = cat.count;
    });

    return {
        total: stats[0]?.total || 0,
        open: stats[0]?.open || 0,
        claimed: stats[0]?.claimed || 0,
        closed: stats[0]?.closed || 0,
        categories
    };
};

module.exports = mongoose.model('Ticket', ticketSchema);
