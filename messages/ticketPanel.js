const categories = require('../categories/categories.json');
const config = require('../config.json');

// Ticket panel message - Components V3
function getTicketPanelMessage() {
    const categoryOptions = Object.entries(categories).map(([key, cat]) => ({
        label: cat.name,
        value: key,
        description: cat.description,
        emoji: { name: cat.emoji }
    }));

    return {
        flags: 32768, // IS_COMPONENTS_V2 (Components V3)
        components: [
            // Welcome Container
            {
                type: 17, // Container
                components: [
                    {
                        type: 10, // Text Display
                        content: "## 🎫 Welcome to UnderFive Studio's Support!\n\nNeed help with your server or have questions about our products? Our support team is here to assist you with any inquiries.\n\n**🕐 Support Hours:**\n• We aim to respond within **24 hours**\n• Priority support for active customers"
                    }
                ]
            },

            // Categories Info Container
            {
                type: 17, // Container
                components: [
                    {
                        type: 10, // Text Display
                        content: "## 📋 Available Categories\n\nSelect the category that best matches your inquiry:\n\n• **General Support** - General questions and assistance\n• **Technical Support** - Technical issues and bug reports\n• **Pre-Sales** - Questions before purchasing\n• **Complaint** - Feedback and complaints\n• **Other** - Any other topics"
                    }
                ]
            },

            // Create Ticket Container
            {
                type: 17, // Container
                components: [
                    {
                        type: 9, // Section
                        components: [
                            {
                                type: 10, // Text Display
                                content: "🎟️ **Encountering issues or have feedback?** I'm always open for private messages, or you can raise a ticket."
                            }
                        ],
                        accessory: {
                            type: 2, // Button
                            custom_id: 'open_ticket_menu',
                            label: 'Create a Ticket',
                            style: 2 // Secondary
                        }
                    }
                ]
            }
        ]
    };
}


// Ticket welcome message - Components V3
function getTicketWelcomeMessage(ticket, user, category) {
    const cat = categories[category];

    return {
        flags: 32768, // IS_COMPONENTS_V2
        components: [
            {
                type: 17, // Container
                components: [
                    {
                        type: 9, // Section
                        components: [
                            {
                                type: 10, // Text Display
                                content: `## ${cat.emoji} ${ticket.ticketName}\n\n**Category:** ${cat.name}\n**Created by:** <@${user.id}>\n**Date:** <t:${Math.floor(ticket.createdAt / 1000)}:F>\n\n---\n\n**Our support team will assist you as soon as possible.**\n\n⏰ *You will receive an automatic warning if there is no response within 24 hours.*`
                            }
                        ],
                        accessory: {
                            type: 11, // Thumbnail
                            media: {
                                url: user.displayAvatarURL({ dynamic: true, size: 256 })
                            }
                        }
                    },
                    {
                        type: 14, // Separator
                        divider: true,
                        spacing: 1
                    },
                    // Ticket Info
                    {
                        type: 10, // Text Display
                        content: formatFormData(ticket.formData, category)
                    },
                    {
                        type: 14, // Separator
                        divider: true,
                        spacing: 1
                    },
                    // Action Buttons
                    {
                        type: 1, // Action Row
                        components: [
                            {
                                type: 2, // Button
                                custom_id: 'close_ticket',
                                label: 'Close Ticket',
                                style: 4, // Danger
                                emoji: { name: '🔒' }
                            },
                            {
                                type: 2, // Button
                                custom_id: 'add_member',
                                label: 'Add Member',
                                style: 1, // Primary
                                emoji: { name: '➕' }
                            },
                            {
                                type: 2, // Button
                                custom_id: 'remove_member',
                                label: 'Remove Member',
                                style: 2, // Secondary
                                emoji: { name: '➖' }
                            },
                            {
                                type: 2, // Button
                                custom_id: 'call_support',
                                label: 'Call Support',
                                style: 3, // Success
                                emoji: { name: '📢' }
                            }
                        ]
                    }
                ]
            }
        ]
    };
}

// Format form data
function formatFormData(formData, category) {
    const cat = categories[category];
    let content = '### 📋 Request Details\n\n';

    for (const field of cat.modalFields) {
        const value = formData[field.id];
        if (value) {
            content += `**${field.label}:**\n> ${value.replace(/\n/g, '\n> ')}\n\n`;
        }
    }

    return content;
}

// Timeout warning message
function getTimeoutWarningMessage(ticket) {
    return {
        flags: 32768,
        components: [
            {
                type: 17, // Container
                components: [
                    {
                        type: 10,
                        content: `## ⏰ Inactivity Warning\n\n<@${ticket.userId}>, this ticket has had **no response for 24 hours**.\n\n> If your issue has been resolved, please close the ticket.\n> If you still need support, please reply to this message.\n\n⚠️ *If there is no response for another 24 hours, the ticket will be automatically closed.*`
                    }
                ]
            }
        ]
    };
}

// Auto-close message
function getAutoCloseMessage(ticket) {
    return {
        flags: 32768,
        components: [
            {
                type: 17, // Container
                components: [
                    {
                        type: 10,
                        content: `## 🔒 Automatic Closure\n\nThis ticket has been automatically closed due to **48 hours of inactivity**.\n\n> ${ticket.ticketName}\n> Created by: <@${ticket.userId}>\n\nTo create a new request, please visit the support channel.`
                    }
                ]
            }
        ]
    };
}

// Rating message - Components V3
function getRatingMessage(ticket = null) {
    return {
        flags: 32768, // IS_COMPONENTS_V2
        components: [
            {
                type: 17, // Container
                components: [
                    {
                        type: 10, // Text Display
                        content: `## ⭐ How was your support experience?\n\n${ticket ? `**${ticket.ticketName}** has been closed.\n\n` : ''}Thank you for contacting UnderFive Studio's Support!\nPlease take a moment to rate your experience.`
                    },
                    {
                        type: 14, // Separator
                        divider: true,
                        spacing: 1
                    },
                    {
                        type: 10, // Text Display
                        content: "**Please rate your experience:**"
                    },
                    {
                        type: 1, // Action Row
                        components: [
                            { type: 2, custom_id: 'star_1', label: '1', emoji: { name: '⭐' }, style: 2 },
                            { type: 2, custom_id: 'star_2', label: '2', emoji: { name: '⭐' }, style: 2 },
                            { type: 2, custom_id: 'star_3', label: '3', emoji: { name: '⭐' }, style: 2 },
                            { type: 2, custom_id: 'star_4', label: '4', emoji: { name: '⭐' }, style: 2 },
                            { type: 2, custom_id: 'star_5', label: '5', emoji: { name: '⭐' }, style: 2 }
                        ]
                    }
                ]
            }
        ]
    };
}

// Format duration
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}

// Ticket Created Log Message - Components V3
function getTicketCreatedLogMessage(ticket, user) {
    const cat = categories[ticket.category] || { name: 'Unknown', emoji: '📋', color: '#5865F2' };

    return {
        flags: 32768,
        components: [
            {
                type: 17, // Container
                components: [
                    {
                        type: 9, // Section
                        components: [
                            {
                                type: 10, // Text Display
                                content: `## 📝 Ticket Created\n\n**${ticket.ticketName}** has been created.`
                            }
                        ],
                        accessory: {
                            type: 11, // Thumbnail
                            media: {
                                url: user.displayAvatarURL({ dynamic: true, size: 256 })
                            }
                        }
                    },
                    {
                        type: 14, // Separator
                        divider: true,
                        spacing: 1
                    },
                    {
                        type: 10,
                        content: `### 📋 Details\n\n👤 **User:** <@${ticket.userId}>\n🏷️ **Type:** ${cat.name}\n📁 **Channel:** <#${ticket.channelId}>\n📅 **Created:** <t:${Math.floor(ticket.createdAt / 1000)}:F>`
                    }
                ]
            }
        ]
    };
}

// Ticket Closed Log Message - Components V3 (for editing)
function getTicketClosedLogMessage(ticket, closedBy, extra = {}) {
    const cat = categories[ticket.category] || { name: 'Unknown', emoji: '📋', color: '#5865F2' };
    const now = Date.now();
    const duration = now - ticket.createdAt;

    let detailsContent = `### 📋 Details\n\n👤 **Original User:** <@${ticket.userId}>\n🏷️ **Type:** ${cat.name}\n🔒 **Closed by:** ${closedBy ? `<@${closedBy.id}>` : 'System'}\n📅 **Closed:** <t:${Math.floor(now / 1000)}:F>\n⏱️ **Duration:** ${formatDuration(duration)}`;

    if (extra.rating) {
        detailsContent += `\n⭐ **Rating:** ${'⭐'.repeat(extra.rating)}`;
    }

    // Channel-based tickets don't have a URL after deletion, so we skip this

    if (extra.transcriptUrl) {
        detailsContent += `\n💬 **Transcript:** [View Transcript](${extra.transcriptUrl})`;
    }

    return {
        flags: 32768,
        components: [
            {
                type: 17, // Container
                components: [
                    {
                        type: 9, // Section
                        components: [
                            {
                                type: 10, // Text Display
                                content: `## 🔒 Ticket Closed\n\n**${ticket.ticketName}** has been closed.`
                            }
                        ],
                        accessory: extra.userAvatar ? {
                            type: 11, // Thumbnail
                            media: {
                                url: extra.userAvatar
                            }
                        } : undefined
                    },
                    {
                        type: 14, // Separator
                        divider: true,
                        spacing: 1
                    },
                    {
                        type: 10,
                        content: detailsContent
                    }
                ]
            }
        ]
    };
}

// Legacy embed function (kept for compatibility)
function getTicketLogEmbed(ticket, action, user, extra = {}) {
    const { EmbedBuilder } = require('discord.js');
    const cat = categories[ticket.category] || { name: 'Unknown', emoji: '❓', color: '#5865F2' };

    const embed = new EmbedBuilder()
        .setColor(cat.color)
        .setTimestamp();

    switch (action) {
        case 'create':
            embed.setTitle(`${cat.emoji} New Ticket Created`)
                .setDescription(`**Ticket #${ticket.ticketNumber}** has been created.`)
                .addFields(
                    { name: 'Category', value: cat.name, inline: true },
                    { name: 'Created by', value: `<@${ticket.userId}>`, inline: true },
                    { name: 'Channel', value: `<#${ticket.channelId}>`, inline: true }
                );
            break;

        case 'close':
            embed.setTitle('🔒 Ticket Closed')
                .setColor('#ED4245')
                .setDescription(`**Ticket #${ticket.ticketNumber}** has been closed.`)
                .addFields(
                    { name: 'Category', value: cat.name, inline: true },
                    { name: 'Created by', value: `<@${ticket.userId}>`, inline: true },
                    { name: 'Closed by', value: user ? `<@${user.id}>` : 'System', inline: true }
                );
            if (extra.rating) {
                embed.addFields({ name: 'Rating', value: '⭐'.repeat(extra.rating), inline: true });
            }
            break;

        case 'auto_close':
            embed.setTitle('⏰ Ticket Auto-Closed')
                .setColor('#FEE75C')
                .setDescription(`**Ticket #${ticket.ticketNumber}** was closed due to 48 hours of inactivity.`)
                .addFields(
                    { name: 'Category', value: cat.name, inline: true },
                    { name: 'Created by', value: `<@${ticket.userId}>`, inline: true }
                );
            break;
    }

    return embed;
}

module.exports = {
    getTicketPanelMessage,
    getTicketWelcomeMessage,
    getTimeoutWarningMessage,
    getAutoCloseMessage,
    getRatingMessage,
    getTicketLogEmbed,
    getTicketCreatedLogMessage,
    getTicketClosedLogMessage,
    formatDuration
};
