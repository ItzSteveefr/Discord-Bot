const config = require('../../config.json');

module.exports = {
    customId: 'redirect_support',

    async execute(interaction) {
        const supportChannel = `<#${config.ticketPanelChannelId}>`;

        await interaction.reply({
            content: `🎫 **Please visit our support channel to create a ticket:**\n\n${supportChannel}`,
            flags: 64
        });
    }
};
