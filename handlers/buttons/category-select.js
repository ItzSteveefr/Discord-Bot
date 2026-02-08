const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const categories = require('../../categories/categories.json');

module.exports = {
    customId: 'ticket_category_select',

    async execute(interaction) {
        const selectedCategory = interaction.values[0];
        const category = categories[selectedCategory];

        if (!category) {
            return await interaction.reply({
                content: '❌ Invalid category selection!',
                flags: 64
            });
        }

        // Create modal
        const modal = new ModalBuilder()
            .setCustomId(`ticket_modal_${selectedCategory}`)
            .setTitle(category.modalTitle || `${category.emoji} ${category.name}`);

        // Add modal fields
        for (const field of category.modalFields) {
            const textInput = new TextInputBuilder()
                .setCustomId(field.id)
                .setLabel(field.label)
                .setStyle(field.type === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                .setRequired(field.required !== false)
                .setMaxLength(field.maxLength || 1000);

            if (field.placeholder) {
                textInput.setPlaceholder(field.placeholder);
            }

            const actionRow = new ActionRowBuilder().addComponents(textInput);
            modal.addComponents(actionRow);
        }

        // Show modal
        await interaction.showModal(modal);
    }
};
