/**
 * Random Member Command
 * Pick a random member from the server
 */

const { SlashCommandBuilder, ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { BRAND_COLORS } = require('../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('randommember')
        .setDescription('Pick a random member from the server')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('Only pick from members with this role')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('include_bots')
                .setDescription('Include bots in the selection')
                .setRequired(false)
        ),

    async execute(interaction, client) {
        const role = interaction.options.getRole('role');
        const includeBots = interaction.options.getBoolean('include_bots') || false;

        await interaction.deferReply();

        // Fetch all members
        await interaction.guild.members.fetch();

        let members = interaction.guild.members.cache;

        // Filter by role if specified
        if (role) {
            members = members.filter(m => m.roles.cache.has(role.id));
        }

        // Filter out bots if not included
        if (!includeBots) {
            members = members.filter(m => !m.user.bot);
        }

        if (members.size === 0) {
            return interaction.editReply({
                components: [
                    new TextDisplayBuilder().setContent('❌ No members found matching your criteria.')
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Pick random member
        const membersArray = Array.from(members.values());
        const randomMember = membersArray[Math.floor(Math.random() * membersArray.length)];

        const container = new ContainerBuilder()
            .setAccentColor(BRAND_COLORS.premium);

        const section = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('# 🎲 Random Member'),
                new TextDisplayBuilder().setContent(
                    `**Winner:** <@${randomMember.id}>\n\n` +
                    `Selected from ${members.size} member${members.size !== 1 ? 's' : ''}` +
                    (role ? ` with <@&${role.id}>` : '')
                )
            )
            .setThumbnailAccessory(
                new ThumbnailBuilder()
                    .setURL(randomMember.displayAvatarURL({ size: 256 }))
                    .setDescription(randomMember.user.username)
            );

        container.addSectionComponents(section);

        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true)
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Joined:** <t:${Math.floor(randomMember.joinedAt.getTime() / 1000)}:R>\n` +
                `**Account Created:** <t:${Math.floor(randomMember.user.createdAt.getTime() / 1000)}:R>`
            )
        );

        // Re-roll button
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`randommember_reroll_${role?.id || 'none'}_${includeBots}`)
                    .setLabel('Pick Again')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎲')
            );

        await interaction.editReply({
            components: [container, actionRow],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
