/**
 * Giveaway Model
 * Stores active and ended giveaways
 */

const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
    // Message that contains the giveaway
    messageId: {
        type: String,
        required: true,
        unique: true
    },

    // Channel and guild
    channelId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true,
        index: true
    },

    // Giveaway details
    prize: {
        type: String,
        required: true
    },
    description: String,

    // Number of winners
    winners: {
        type: Number,
        required: true,
        min: 1,
        max: 20
    },

    // Timestamps
    endTime: {
        type: Date,
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },

    // Host
    hostId: {
        type: String,
        required: true
    },
    hostName: String,

    // Requirements
    requiredRole: String,

    // Participants
    participants: [String],

    // Status
    ended: {
        type: Boolean,
        default: false,
        index: true
    },

    // Winners (filled when giveaway ends)
    winnerIds: [String]
}, {
    timestamps: true
});

// Index for finding active giveaways
giveawaySchema.index({ ended: 1, endTime: 1 });

// Static method to get active giveaways that need to end
giveawaySchema.statics.getEndingGiveaways = async function () {
    return await this.find({
        ended: false,
        endTime: { $lte: new Date() }
    });
};

// Static method to get active giveaways for a guild
giveawaySchema.statics.getActiveGiveaways = async function (guildId) {
    return await this.find({
        guildId,
        ended: false,
        endTime: { $gt: new Date() }
    }).sort({ endTime: 1 });
};

// Method to add participant
giveawaySchema.methods.addParticipant = async function (userId) {
    if (!this.participants.includes(userId)) {
        this.participants.push(userId);
        await this.save();
        return true;
    }
    return false;
};

// Method to remove participant
giveawaySchema.methods.removeParticipant = async function (userId) {
    const index = this.participants.indexOf(userId);
    if (index > -1) {
        this.participants.splice(index, 1);
        await this.save();
        return true;
    }
    return false;
};

// Method to select winners
giveawaySchema.methods.selectWinners = function () {
    if (this.participants.length === 0) return [];

    const shuffled = [...this.participants].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(this.winners, this.participants.length));
};

// Method to end giveaway
giveawaySchema.methods.endGiveaway = async function () {
    this.winnerIds = this.selectWinners();
    this.ended = true;
    await this.save();
    return this.winnerIds;
};

module.exports = mongoose.model('Giveaway', giveawaySchema);
