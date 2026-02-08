const { buildPingComponents, buildMemberCountComponents, getDbPing } = require('../../commands/general.js');
const { MessageFlags } = require('../../utils/componentBuilders.js');

module.exports = {
    customId: ['ping_refresh', 'membercount_refresh'],

    async execute(interaction) {
        const { customId } = interaction;

        if (customId === 'ping_refresh') {
            const { type: dbType, ping: dbPing } = await getDbPing(interaction.client);
            const components = await buildPingComponents(interaction.client, 'active', dbPing, dbType);

            const container = components[0];
            const data = container.toJSON();
            await interaction.update({
                embeds: data.embeds,
                components: data.components
            });
        } else if (customId === 'membercount_refresh') {
            const components = await buildMemberCountComponents(interaction.guild);

            const container = components[0];
            const data = container.toJSON();
            await interaction.update({
                embeds: data.embeds,
                components: data.components
            });
        }
    }
};
