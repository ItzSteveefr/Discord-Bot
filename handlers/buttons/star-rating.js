const db = require('../../database/db.js');
const config = require('../../config.json');

module.exports = {
    customId: ['star_1', 'star_2', 'star_3', 'star_4', 'star_5'],

    async execute(interaction) {
        // Get rating (star_1 -> 1, star_5 -> 5)
        const rating = parseInt(interaction.customId.split('_')[1]);

        // Check if this is a DM (rating from closed ticket)
        if (!interaction.guild) {
            // DM rating - just record the rating
            const data = db.readTickets();

            // Update average rating
            const totalRatings = data.ticketStats.ratingCount * data.ticketStats.averageRating;
            data.ticketStats.ratingCount++;
            data.ticketStats.averageRating = (totalRatings + rating) / data.ticketStats.ratingCount;

            db.writeTickets(data);

            // Delete the rating message
            try {
                await interaction.message.delete();
            } catch (e) {
                // Message already deleted
            }

            // Send to review channel if configured
            if (config.reviewChannelId) {
                try {
                    const reviewChannel = await interaction.client.channels.fetch(config.reviewChannelId);
                    if (reviewChannel) {
                        const { EmbedBuilder } = require('discord.js');
                        const reviewEmbed = new EmbedBuilder()
                            .setColor('#FFD700') // Gold color
                            .setDescription(`### ⭐ New Review Received!\n\n**Rating:** ${'⭐'.repeat(rating)} **(${rating}/5)**\n**User:** <@${interaction.user.id}> (${interaction.user.tag})`)
                            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                            .setFooter({ text: 'UnderFive Ticket System', iconURL: interaction.client.user.displayAvatarURL() })
                            .setTimestamp();

                        await reviewChannel.send({ embeds: [reviewEmbed] });
                    }
                } catch (error) {
                    console.error('Error sending review log:', error);
                }
            }

            // Send thank you message (Components V3)
            await interaction.reply({
                flags: 32768, // IS_COMPONENTS_V2
                components: [
                    {
                        type: 17, // Container
                        components: [
                            {
                                type: 10, // Text Display
                                content: `## ✅ Thank you for your feedback!\n\n${'⭐'.repeat(rating)} **(${rating}/5)**\n\nWe appreciate your rating and will use it to improve our support!`
                            }
                        ]
                    }
                ]
            });
            return;
        }

        // Guild rating - original flow
        const ticket = db.getTicket(interaction.channel.id);

        if (!ticket) {
            return await interaction.reply({
                content: '❌ This channel is not a ticket!',
                flags: 64
            });
        }

        // Only ticket owner can rate
        if (ticket.userId !== interaction.user.id) {
            return await interaction.reply({
                content: '❌ Only the ticket owner can rate!',
                flags: 64
            });
        }

        await interaction.deferReply({ flags: 64 });

        // Close the ticket with rating
        const { closeTicket } = require('../../utils/ticketUtils.js');
        const result = await closeTicket(interaction.channel, interaction.user, rating);

        if (result.success) {
            await interaction.editReply({
                content: `✅ Thank you for your rating! (${'⭐'.repeat(rating)})\n\n🔒 Closing ticket...`
            });
        } else {
            await interaction.editReply({
                content: result.error
            });
        }
    }
};
