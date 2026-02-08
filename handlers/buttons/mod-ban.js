const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    customId: 'ban_',

    async execute(interaction) {
        const userId = interaction.customId.replace('ban_', '');

        // Permission check
        if (!interaction.member.permissions.has('BanMembers')) {
            return await interaction.reply({
                content: '❌ **Permission Denied!** You need Ban Members permission.',
                flags: 64
            });
        }

        // Show reason modal
        const modal = new ModalBuilder()
            .setCustomId(`ban_confirm_${userId}`)
            .setTitle('🔨 Ban User');

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Ban Reason')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setPlaceholder('Enter the reason for banning this user...')
            .setMaxLength(500);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
    }
};
