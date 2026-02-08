const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ContainerBuilder, SeparatorSpacingSize } = require('../utils/componentBuilders.js');
const moderationDb = require('../database/moderationDb.js');

function parseTime(timeStr) {
    const match = timeStr.match(/^(\d+)([smhd])$/i);
    if (!match) return null;

    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = {
        s: 1000,
        m: 1000 * 60,
        h: 1000 * 60 * 60,
        d: 1000 * 60 * 60 * 24
    };

    return amount * multipliers[unit];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('Temporarily ban a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration (e.g., 1h, 30m, 1d)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false)
        ),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const durationStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const container = new ContainerBuilder().setAccentColor(0xFF0000);

        const duration = parseTime(durationStr);
        if (!duration) {
            container.addTextDisplayComponents(td => td.setContent(`# ❌ Invalid Duration`));
            container.addTextDisplayComponents(td => td.setContent(`Please use format like 1h, 30m, 1d.`));
            const errData = container.toJSON();
            return interaction.reply({ embeds: errData.embeds, components: errData.components, ephemeral: true });
        }

        try {
            let member;
            try {
                member = await interaction.guild.members.fetch(targetUser.id);
            } catch (e) {
                // User not in guild
            }

            if (member) {
                if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
                    container.addTextDisplayComponents(td => td.setContent(`# ❌ Hierarchy Error`));
                    container.addTextDisplayComponents(td => td.setContent(`You cannot ban ${targetUser} because their role is equal or higher than yours.`));
                    const errData = container.toJSON();
                    return interaction.reply({ embeds: errData.embeds, components: errData.components, ephemeral: true });
                }
            }

            try {
                await targetUser.send(`**You have been temporarily banned from ${interaction.guild.name}**\nDuration: ${durationStr}\nReason: ${reason}`);
            } catch (e) { }

            await interaction.guild.members.ban(targetUser.id, { reason: `Tempban (${durationStr}): ${reason}` });

            moderationDb.addAction(interaction.guild.id, {
                type: 'tempban',
                userId: targetUser.id,
                moderator: { id: interaction.user.id, username: interaction.user.username },
                reason: reason,
                duration: duration
            });

            setTimeout(async () => {
                try {
                    await interaction.guild.members.unban(targetUser.id, 'Tempban expired');
                } catch (e) {
                    console.error('Failed to unban user:', e);
                }
            }, duration);

            container.addTextDisplayComponents(td => td.setContent(`# 🔨 User Temporarily Banned`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(`**User:** ${targetUser}\n**Duration:** ${durationStr}\n**Reason:** ${reason}`));
            container.addTextDisplayComponents(td => td.setContent(`**UnderFive Studios** | <t:${Math.floor(Date.now() / 1000)}:R>`));

            const data = container.toJSON();
            await interaction.reply({ embeds: data.embeds, components: data.components });

        } catch (error) {
            console.error(error);
            container.addTextDisplayComponents(td => td.setContent(`# ❌ Error`));
            container.addTextDisplayComponents(td => td.setContent(`An error occurred: ${error.message}`));
            const errData = container.toJSON();
            await interaction.reply({ embeds: errData.embeds, components: errData.components, ephemeral: true });
        }
    }
};
