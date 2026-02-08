const db = require('../../database/db.js');
const config = require('../../config.json');

const cooldowns = new Map();

module.exports = {
    customId: 'call_support',

    async execute(interaction) {
        const ticket = db.getTicket(interaction.channel.id);

        if (!ticket) {
            return await interaction.reply({
                content: '❌ This channel is not a ticket!',
                flags: 64
            });
        }

        const userId = interaction.user.id;
        const cooldownTime = 18000; // 5 hours
        const currentTimestamp = Math.floor(Date.now() / 1000);

        // Cooldown check
        if (cooldowns.has(userId)) {
            const expirationTime = cooldowns.get(userId) + cooldownTime;

            if (currentTimestamp < expirationTime) {
                return await interaction.reply({
                    content: `⏰ Please wait **<t:${expirationTime}:R>** before calling support again.`,
                    flags: 64
                });
            }
        }

        cooldowns.set(userId, currentTimestamp);

        // Send notification to support call channel
        const supportChannelId = config.supportCallChannelId || config.ticketLogChannelId;
        if (!supportChannelId) {
            return await interaction.reply({
                content: '⚠️ Support channel is not configured!',
                flags: 64
            });
        }

        try {
            const logChannel = await interaction.client.channels.fetch(supportChannelId);

            if (!logChannel) {
                return await interaction.reply({
                    content: '❌ Log channel not found!',
                    flags: 64
                });
            }

            const { EmbedBuilder } = require('discord.js');

            const embed = new EmbedBuilder()
                .setColor('#FF5733')
                .setTitle('📢 Support Call')
                .setDescription(`**<@${interaction.user.id}>** is requesting support!`)
                .addFields(
                    { name: 'Ticket', value: `<#${interaction.channel.id}>`, inline: true },
                    { name: 'Ticket #', value: `${ticket.ticketNumber}`, inline: true },
                    { name: 'Time', value: `<t:${currentTimestamp}:F>`, inline: true }
                )
                .setTimestamp();

            await logChannel.send({
                content: config.supportRoleId ? `<@&${config.supportRoleId}>` : '',
                embeds: [embed]
            });

            await interaction.reply({
                content: '✅ Support team has been notified! They will get back to you as soon as possible.',
                flags: 64
            });

        } catch (error) {
            console.error('Support call error:', error);
            await interaction.reply({
                content: '❌ An error occurred while sending the support call!',
                flags: 64
            });
        }
    }
};
