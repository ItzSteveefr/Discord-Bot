const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    customId: 'timeout_',

    async execute(interaction) {
        const userId = interaction.customId.replace('timeout_', '');

        // Permission check
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return await interaction.reply({
                content: '❌ **Permission Denied!** You need Moderate Members permission.',
                flags: 64
            });
        }

        // Show duration/reason modal
        const modal = new ModalBuilder()
            .setCustomId(`timeout_confirm_${userId}`)
            .setTitle('⏰ Timeout User');

        const durationInput = new TextInputBuilder()
            .setCustomId('duration')
            .setLabel('Duration (minutes)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('e.g. 60')
            .setMaxLength(10);

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Timeout Reason')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setPlaceholder('Enter the reason for timeout...')
            .setMaxLength(500);

        modal.addComponents(
            new ActionRowBuilder().addComponents(durationInput),
            new ActionRowBuilder().addComponents(reasonInput)
        );
        await interaction.showModal(modal);
    }
};
