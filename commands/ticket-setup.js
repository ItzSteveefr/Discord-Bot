const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicketPanelMessage } = require('../messages/ticketPanel.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('Sends the ticket panel to this channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        try {
            const panelMessage = getTicketPanelMessage();
            await interaction.channel.send(panelMessage);

            await interaction.editReply({
                content: '✅ Ticket panel sent successfully!'
            });
        } catch (error) {
            console.error('Ticket panel error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while sending the ticket panel: ' + error.message
            });
        }
    }
};
