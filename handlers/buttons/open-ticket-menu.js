const categories = require('../../categories/categories.json');
const { getTicketPanelMessage } = require('../../messages/ticketPanel.js');

module.exports = {
    customId: 'open_ticket_menu',

    async execute(interaction) {
        const categoryOptions = Object.entries(categories).map(([key, cat]) => ({
            label: cat.name,
            value: key,
            description: cat.description,
            emoji: { name: cat.emoji }
        }));

        // Show category select menu
        await interaction.reply({
            content: '📩 **Select a category to create your ticket:**',
            components: [
                {
                    type: 1, // Action Row
                    components: [
                        {
                            type: 3, // String Select Menu
                            custom_id: 'ticket_category_select',
                            placeholder: '📩 Select a category...',
                            options: categoryOptions
                        }
                    ]
                }
            ],
            flags: 64
        });
    }
};
