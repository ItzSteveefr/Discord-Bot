const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db.js');
const { addMemberToTicket } = require('../utils/ticketUtils.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-add')
        .setDescription('Adds a user to the ticket')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to add')
                .setRequired(true)
        ),

    async execute(interaction) {
        const ticket = db.getTicket(interaction.channel.id);

        if (!ticket) {
            return await interaction.reply({
                content: '❌ This command can only be used in ticket channels!',
                flags: 64
            });
        }

        const targetUser = interaction.options.getUser('user');

        await interaction.deferReply({ flags: 64 });

        const result = await addMemberToTicket(interaction.channel, targetUser);

        if (result.success) {
            await interaction.editReply({
                content: `✅ <@${targetUser.id}> has been added to the ticket!`
            });
        } else {
            await interaction.editReply({
                content: result.error
            });
        }
    }
};
