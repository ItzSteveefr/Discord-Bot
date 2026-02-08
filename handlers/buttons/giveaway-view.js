const { MessageFlags } = require('discord.js');
const giveawayDb = require('../../database/giveawayDb');

const SAFE_MENTIONS = { parse: [] };

module.exports = {
    customId: 'giveaway_view',

    match(customId) {
        return customId.startsWith('giveaway_view:');
    },

    async execute(interaction) {
        try {
            const [, giveawayId] = interaction.customId.match(/^giveaway_view:([\w_-]+)$/) || [];

            if (!giveawayId) {
                return interaction.reply({
                    content: `❌ Invalid giveaway button.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const giveaway = giveawayDb.getGiveawayById(interaction.guildId, giveawayId);

            if (!giveaway) {
                return interaction.reply({
                    content: `❌ Giveaway not found.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const entries = giveaway.entries || [];

            if (entries.length === 0) {
                return interaction.reply({
                    content: `➡️ No participants yet.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Show up to 25 participants
            const preview = entries.slice(0, 25).map((id, i) => `${i + 1}. <@${id}>`).join('\n');
            const more = entries.length > 25 ? `\n...and ${entries.length - 25} more` : '';

            return interaction.reply({
                content: `➡️ **Participants (${entries.length}):**\n${preview}${more}`,
                flags: MessageFlags.Ephemeral,
                allowedMentions: SAFE_MENTIONS
            });

        } catch (err) {
            console.error('[giveaway_view] failed:', err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ Unable to fetch participants right now.`,
                    flags: MessageFlags.Ephemeral
                }).catch(() => { });
            }
        }
    }
};
