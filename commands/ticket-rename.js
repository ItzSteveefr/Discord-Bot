const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db.js');
const { renameTicket } = require('../utils/ticketUtils.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-rename')
        .setDescription('Renames the ticket')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('New ticket name')
                .setRequired(true)
                .setMaxLength(100)
        ),

    async execute(interaction) {
        const ticket = db.getTicket(interaction.channel.id);

        if (!ticket) {
            return await interaction.reply({
                content: '❌ This command can only be used in ticket channels!',
                flags: 64
            });
        }

        const newName = interaction.options.getString('name');

        await interaction.deferReply({ flags: 64 });

        const result = await renameTicket(interaction.channel, newName);

        if (result.success) {
            await interaction.editReply({
                content: `✅ Ticket renamed to **${newName}**!`
            });
        } else {
            await interaction.editReply({
                content: result.error
            });
        }
    }
};
