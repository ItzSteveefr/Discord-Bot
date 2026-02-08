const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db.js');
const { closeTicket } = require('../utils/ticketUtils.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-close')
        .setDescription('Closes this ticket')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Closure reason (optional)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const ticket = db.getTicket(interaction.channel.id);

        if (!ticket) {
            return await interaction.reply({
                content: '❌ This command can only be used in ticket channels!',
                flags: 64
            });
        }

        const reason = interaction.options.getString('reason') || 'No reason specified';

        await interaction.deferReply({ flags: 64 });

        // Closure message
        await interaction.channel.send({
            content: `📝 **Closure reason:** ${reason}`
        });

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
