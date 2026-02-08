const { addMemberToTicket } = require('../../utils/ticketUtils.js');

module.exports = {
    customId: 'add_user_select',

    async execute(interaction) {
        const targetUserId = interaction.values[0];

        try {
            const targetUser = await interaction.client.users.fetch(targetUserId);
            const result = await addMemberToTicket(interaction.channel, targetUser);

            if (result.success) {
                await interaction.update({
                    content: `✅ <@${targetUserId}> has been added to the ticket!`,
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
                content: '❌ An error occurred while adding the user!',
                components: []
            });
        }
    }
};
