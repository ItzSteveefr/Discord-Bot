const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SeparatorSpacingSize } = require('discord.js');
const { BRAND_COLORS } = require('../config/config');

function buildCoinflipComponents() {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '🪙' : '💰';

    const container = new ContainerBuilder()
        .setAccentColor(BRAND_COLORS.premium);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# 🪙 Coin Flip'),
        new TextDisplayBuilder().setContent(`The coin landed on...`)
    );

    container.addSeparatorComponents(
        new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Large)
    );

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## ${emoji} ${result}!`)
    );

    // Flip again button
    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('coinflip_again')
                .setLabel('Flip Again')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🪙')
        );

    return [container, actionRow];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin'),

    async execute(interaction, client) {
        const components = buildCoinflipComponents();

        await interaction.reply({
            components: components,
            flags: MessageFlags.IsComponentsV2
        });
    },

    buildCoinflipComponents
};
