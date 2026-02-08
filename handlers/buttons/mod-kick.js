const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    customId: 'kick_',

    async execute(interaction) {
        const userId = interaction.customId.replace('kick_', '');

        // Permission check
        if (!interaction.member.permissions.has('KickMembers')) {
            return await interaction.reply({
                content: '❌ **Permission Denied!** You need Kick Members permission.',
                flags: 64
            });
        }

        // Show reason modal
        const modal = new ModalBuilder()
            .setCustomId(`kick_confirm_${userId}`)
            .setTitle('👢 Kick User');

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Kick Reason')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setPlaceholder('Enter the reason for kicking this user...')
            .setMaxLength(500);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
    }
};
