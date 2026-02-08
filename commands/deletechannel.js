/**
 * Delete Channel Command
 * Deletes a channel with confirmation
 */

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { BRAND_COLORS } = require('../config/config');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deletechannel')
        .setDescription('Delete a channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Channel to delete (defaults to current channel)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildForum)
                .setRequired(false)
        ),

    async execute(interaction, client) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        // Create confirmation
        const container = new ContainerBuilder()
            .setAccentColor(BRAND_COLORS.error)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# ⚠️ Delete Channel'),
                new TextDisplayBuilder().setContent(
                    `Are you sure you want to delete **#${channel.name}**?\n\n` +
                    '**This action cannot be undone!**\n\n' +
                    `Type: ${channel.type === ChannelType.GuildVoice ? 'Voice Channel' : 'Text Channel'}`
                )
            );

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_delete_channel_${channel.id}`)
                    .setLabel('Delete Channel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️'),
                new ButtonBuilder()
                    .setCustomId('cancel_action')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        await interaction.reply({
            components: [container, actionRow],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
        });
    }
};
