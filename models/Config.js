/**
 * Guild Configuration Model
 * Stores per-guild settings for the bot
 */

const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    // Guild ID (unique per guild)
    guildId: {
        type: String,
        required: true,
        unique: true
    },

    // Ticket settings
    ticketCategory: String,       // Category for ticket channels
    ticketLogChannel: String,     // Channel for ticket logs
    ticketCounter: {              // Ticket number counter
        type: Number,
        default: 0
    },

    // Logging channels
    modLogChannel: String,        // Moderation logs
    welcomeChannel: String,       // Welcome messages
    autoModChannel: String,       // AutoMod logs

    // Roles
    staffRoles: [String],         // Staff roles (can manage tickets)
    adminRoles: [String],         // Admin roles
    muteRole: String,             // Mute role (if using role-based mute)

    // Ticket category-specific settings
    ticketCategories: {
        plugin_support: {
            staffRole: String,
            enabled: { type: Boolean, default: true },
            categoryChannel: String
        },
        purchase_issue: {
            staffRole: String,
            enabled: { type: Boolean, default: true },
            categoryChannel: String
        },
        technical_help: {
            staffRole: String,
            enabled: { type: Boolean, default: true },
            categoryChannel: String
        },
        general: {
            staffRole: String,
            enabled: { type: Boolean, default: true },
            categoryChannel: String
        }
    },

    // Welcome message settings
    welcomeEnabled: { type: Boolean, default: false },
    welcomeMessage: String,

    // AutoMod settings
    autoModEnabled: { type: Boolean, default: true },

    // Giveaway settings
    giveawayPingRole: String
}, {
    timestamps: true
});

// Static method to get or create config
configSchema.statics.getOrCreate = async function (guildId) {
    let config = await this.findOne({ guildId });

    if (!config) {
        config = await this.create({ guildId });
    }

    return config;
};

// Method to update a setting
configSchema.methods.updateSetting = async function (key, value) {
    this[key] = value;
    await this.save();
    return this;
};

// Method to increment ticket counter and return new number
configSchema.methods.getNextTicketNumber = async function () {
    this.ticketCounter += 1;
    await this.save();
    return this.ticketCounter;
};

// Static method to check if user has staff role
configSchema.statics.isStaff = async function (guildId, member) {
    const config = await this.findOne({ guildId });

    if (!config || !config.staffRoles.length) {
        return member.permissions.has('ManageMessages');
    }

    return config.staffRoles.some(roleId => member.roles.cache.has(roleId));
};

module.exports = mongoose.model('Config', configSchema);
