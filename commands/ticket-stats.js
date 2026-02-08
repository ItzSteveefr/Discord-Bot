const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../database/db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-stats')
        .setDescription('Shows ticket statistics')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const stats = db.getStats();

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📊 Ticket Statistics')
            .addFields(
                { name: '🎫 Active Tickets', value: stats.activeCount.toString(), inline: true },
                { name: '📈 Total Created', value: stats.totalCreated.toString(), inline: true },
                { name: '🔒 Total Closed', value: stats.totalClosed.toString(), inline: true },
                { name: '⭐ Average Rating', value: `${stats.averageRating.toFixed(1)}/5`, inline: true },
                { name: '📝 Total Ratings', value: stats.ratingCount.toString(), inline: true }
            )
            .setFooter({ text: 'Speaw Ticket System' })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: 64
        });
    }
};
