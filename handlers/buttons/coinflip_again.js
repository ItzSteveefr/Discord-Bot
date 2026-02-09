const { buildCoinflipComponents } = require('../../commands/coinflip.js');
const { MessageFlags } = require('discord.js');

module.exports = {
    customId: 'coinflip_again',

    async execute(interaction) {
        const components = buildCoinflipComponents();

        await interaction.update({
            components: components,
            flags: MessageFlags.IsComponentsV2
        });
    }
};
