const db = require('../../database/db.js');
const { removeMemberFromTicket } = require('../../utils/ticketUtils.js');

module.exports = {
    customId: 'remove_user_select',

    async execute(interaction) {
        const targetUserId = interaction.values[0];
        const ticket = db.getTicket(interaction.channel.id);

        if (!ticket) {
            return await interaction.update({
                content: '❌ This channel is not a ticket!',
                components: []
            });
        }

        try {
            const targetUser = await interaction.client.users.fetch(targetUserId);
            const result = await removeMemberFromTicket(interaction.channel, targetUser, ticket);

            if (result.success) {
                await interaction.update({
                    content: `✅ <@${targetUserId}> has been removed from the ticket!`,
                    components: []
                });
            } else {
                await interaction.update({
                    content: result.error,
                    components: []
                });
            }
        } catch (error) {
            await interaction.update({
                content: '❌ An error occurred while removing the user!',
                components: []
            });
        }
    }
};
