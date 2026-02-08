const db = require('../../database/db.js');
const { closeTicket } = require('../../utils/ticketUtils.js');
const { getRatingMessage } = require('../../messages/ticketPanel.js');
const config = require('../../config.json');

module.exports = {
    customId: 'close_ticket',

    async execute(interaction) {
        const ticket = db.getTicket(interaction.channel.id);

        if (!ticket) {
            return await interaction.reply({
                content: '❌ This channel is not a ticket!',
                flags: 64
            });
        }

        const member = interaction.guild.members.cache.get(interaction.user.id);
        const isStaff = member?.roles.cache.has(config.supportRoleId);
        const isOwner = ticket.userId === interaction.user.id;

        // Permission check
        if (!isStaff && !isOwner) {
            return await interaction.reply({
                content: '❌ You do not have permission to close this ticket!',
                flags: 64
            });
        }

        // Send rating message to ticket owner before closing
        const ratingMessage = getRatingMessage(ticket);

        // Try to DM the ticket owner for rating
        try {
            const ticketOwner = await interaction.client.users.fetch(ticket.userId);
            if (ticketOwner) {
                await ticketOwner.send(ratingMessage).catch(() => {
                    // Can't DM user
                });
            }
        } catch (e) {
            // User not found or can't DM
        }

        // Close the ticket
        await interaction.deferReply({ flags: 64 });

        const result = await closeTicket(interaction.channel, interaction.user, null);

        if (result.success) {
            await interaction.editReply({
                content: '✅ Ticket closed successfully!'
            });
        } else {
            await interaction.editReply({
                content: result.error
            });
        }
    }
};
