/**
 * User Model
 * Stores user statistics and infractions
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Discord user ID
    userId: {
        type: String,
        required: true,
        index: true
    },

    // Guild ID (users are tracked per-guild)
    guildId: {
        type: String,
        required: true,
        index: true
    },

    // User info (cached)
    username: String,
    discriminator: String,

    // Statistics
    stats: {
        messagesPosted: { type: Number, default: 0 },
        commandsUsed: { type: Number, default: 0 },
        pokesReceived: { type: Number, default: 0 },
        pokesSent: { type: Number, default: 0 },
        ticketsOpened: { type: Number, default: 0 },
        giveawaysWon: { type: Number, default: 0 }
    },

    // Ticket history (references)
    tickets: [{
        ticketNumber: Number,
        category: String,
        timestamp: Date,
        status: String
    }],

    // First seen and last active
    firstSeen: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Compound index for unique user per guild
userSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Static method to get or create user
userSchema.statics.getOrCreate = async function (userId, guildId, userData = {}) {
    let user = await this.findOne({ userId, guildId });

    if (!user) {
        user = await this.create({
            userId,
            guildId,
            username: userData.username,
            discriminator: userData.discriminator
        });
    }

    return user;
};

// Method to increment a stat
userSchema.methods.incrementStat = async function (statName, amount = 1) {
    const statPath = `stats.${statName}`;
    this.stats[statName] = (this.stats[statName] || 0) + amount;
    this.lastActive = new Date();
    await this.save();
    return this;
};

// Static method to get leaderboard
userSchema.statics.getLeaderboard = async function (guildId, statName, limit = 10) {
    const statPath = `stats.${statName}`;

    return await this.find({ guildId })
        .sort({ [statPath]: -1 })
        .limit(limit)
        .select(`userId username ${statPath}`);
};


module.exports = mongoose.model('User', userSchema);

