const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ContainerBuilder, SeparatorSpacingSize } = require('../utils/componentBuilders.js');
const moderationDb = require('../database/moderationDb.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to kick')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false)
        ),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const container = new ContainerBuilder().setAccentColor(0xFF0000);

        try {
            const member = await interaction.guild.members.fetch(targetUser.id);

            if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
                container.addTextDisplayComponents(td => td.setContent(`# ❌ Hierarchy Error`));
                container.addTextDisplayComponents(td => td.setContent(`You cannot kick ${targetUser} because their role is equal or higher than yours.`));
                const errData = container.toJSON();
                return interaction.reply({ embeds: errData.embeds, components: errData.components, ephemeral: true });
            }

            if (!member.kickable) {
                container.addTextDisplayComponents(td => td.setContent(`# ❌ Permission Error`));
                container.addTextDisplayComponents(td => td.setContent(`I cannot kick ${targetUser}. Is my role high enough?`));
                const errData = container.toJSON();
                return interaction.reply({ embeds: errData.embeds, components: errData.components, ephemeral: true });
            }

            try {
                await targetUser.send(`**You have been kicked from ${interaction.guild.name}**\nReason: ${reason}`);
            } catch (e) { }

            await member.kick(reason);

            moderationDb.addAction(interaction.guild.id, {
                type: 'kick',
                userId: targetUser.id,
                moderator: { id: interaction.user.id, username: interaction.user.username },
                reason: reason
            });

            container.addTextDisplayComponents(td => td.setContent(`# 👢 User Kicked`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(`**User:** ${targetUser}\n**Reason:** ${reason}`));
            container.addTextDisplayComponents(td => td.setContent(`**UnderFive Studios** | <t:${Math.floor(Date.now() / 1000)}:R>`));

            const data = container.toJSON();
            await interaction.reply({ embeds: data.embeds, components: data.components });

        } catch (error) {
            console.error(error);
            container.addTextDisplayComponents(td => td.setContent(`# ❌ Error`));
            if (error.code === 10007) {
                container.addTextDisplayComponents(td => td.setContent(`User not found in server.`));
            } else {
                container.addTextDisplayComponents(td => td.setContent(`An error occurred: ${error.message}`));
            }
            const errData = container.toJSON();
            await interaction.reply({ embeds: errData.embeds, components: errData.components, ephemeral: true });
        }
    }
};
