const { UserSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const db = require('../../database/db.js');

module.exports = {
    customId: 'add_member',

    async execute(interaction) {
        const ticket = db.getTicket(interaction.channel.id);

        if (!ticket) {
            return await interaction.reply({
                content: '❌ This channel is not a ticket!',
                flags: 64
            });
        }

        // User select menu
        const selectMenu = new UserSelectMenuBuilder()
            .setCustomId('add_user_select')
            .setPlaceholder('Select a user to add...')
            .setMinValues(1)
            .setMaxValues(1);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            content: '👤 **Select the user you want to add to the ticket:**',
            components: [row],
            flags: 64
        });
    }
};
