const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags, ComponentType } = require('discord.js');
const embedDb = require('../../database/embedDb');
const { buildEmbedBuilderUI, buildFinalMessage, parseEmbedCode } = require('../../utils/embedUtils');

module.exports = {
    customId: 'embed',
    // Dynamic match for anything starting with 'embed_'
    match: (customId) => customId.startsWith('embed_'),

    async execute(interaction) {
        const customId = interaction.customId;
        const userId = interaction.user.id;

        // Ensure user owns the interaction (simple check if ID ends with userId)
        if (!customId.endsWith(userId)) {
            return interaction.reply({ content: '❌ You cannot control this session.', ephemeral: true });
        }

        const action = customId.split('_')[1]; // embed_[action]_userId
        let draft = embedDb.getDraft(userId);

        // --- MODAL OPENERS ---
        if (['title', 'desc', 'color', 'url', 'image', 'thumb', 'author', 'footer', 'code'].includes(action)) {
            const modal = new ModalBuilder().setCustomId(`embed_modal_${action}_${userId}`).setTitle(`Edit ${action.charAt(0).toUpperCase() + action.slice(1)}`);

            const input = new TextInputBuilder()
                .setCustomId('input')
                .setLabel(action === 'code' ? 'Embed Code' : `Enter ${action}`)
                .setStyle(action === 'desc' || action === 'code' ? TextInputStyle.Paragraph : TextInputStyle.Short);

            // Pre-fill if exists
            let value = '';
            if (action === 'title') value = draft.title || '';
            if (action === 'desc') value = draft.description || '';
            if (action === 'color') value = draft.color ? draft.color.toString(16) : '';
            if (action === 'url') value = draft.url || '';
            if (action === 'image') value = draft.image || '';
            if (action === 'thumb') value = draft.thumbnail || '';
            if (action === 'author') value = draft.author ? `${draft.author.name} && ${draft.author.iconURL || ''} && ${draft.author.url || ''}` : '';
            if (action === 'footer') value = draft.footer ? `${draft.footer.text} && ${draft.footer.iconURL || ''}` : '';

            if (value) input.setValue(value.substring(0, 4000)); // Limit to prevent errors

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
            return;
        }

        // --- FIELDS ---
        if (action === 'field') {
            const modal = new ModalBuilder().setCustomId(`embed_modal_field_${userId}`).setTitle('Add Field');

            const nameInput = new TextInputBuilder().setCustomId('name').setLabel('Field Name').setStyle(TextInputStyle.Short).setRequired(true);
            const valueInput = new TextInputBuilder().setCustomId('value').setLabel('Field Value').setStyle(TextInputStyle.Paragraph).setRequired(true);
            const inlineInput = new TextInputBuilder().setCustomId('inline').setLabel('Inline? (true/false)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('false');

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(valueInput),
                new ActionRowBuilder().addComponents(inlineInput)
            );
            await interaction.showModal(modal);
            return;
        }

        // --- TOGGLES / ACTIONS ---
        if (action === 'timestamp') {
            draft.timestamp = !draft.timestamp;
            embedDb.saveDraft(userId, draft);

            const container = buildEmbedBuilderUI(userId, draft);
            const data = container.toJSON();
            await interaction.update({ embeds: data.embeds, components: data.components });
            return;
        }

        if (action === 'clear') {
            embedDb.clearDraft(userId);
            // Re-get clean draft
            draft = embedDb.getDraft(userId);
            const container = buildEmbedBuilderUI(userId, draft);
            const data = container.toJSON();
            await interaction.update({ embeds: data.embeds, components: data.components });
            return;
        }

        if (action === 'preview') {
            // Just Send an ephemeral preview
            const messagePayload = buildFinalMessage(draft);
            messagePayload.ephemeral = true;
            await interaction.reply(messagePayload);
            return;
        }

        if (action === 'send') {
            // Ask for channel? Or sending to current channel?
            // Prompt says: "Send"
            // Usually this implies sending to the *same* channel.

            const messagePayload = buildFinalMessage(draft);

            try {
                await interaction.channel.send(messagePayload);
                await interaction.reply({ content: '✅ Embed sent!', ephemeral: true });
            } catch (err) {
                await interaction.reply({ content: `❌ Failed to send: ${err.message}`, ephemeral: true });
            }
            return;
        }
    }
};
