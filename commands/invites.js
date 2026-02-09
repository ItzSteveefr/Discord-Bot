const { SlashCommandBuilder, ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const inviteDb = require('../database/inviteDb.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('View invite statistics')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to view invites for')
                .setRequired(false)
        ),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;

        let inviteData = inviteDb.getUserInvites(guildId, targetUser.id);

        if (!inviteData) {
            inviteData = {
                total: 0,
                regular: 0,
                left: 0,
                fake: 0,
                bonus: 0
            };
        }

        const container = new ContainerBuilder()
            .setAccentColor(0x5865F2);

        container.addTextDisplayComponents(td =>
            td.setContent(`# 📨 Invite Stats`)
        );

        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

        const statsText = [
            `**User:** ${targetUser}`,
            '',
            `📨 **Total Invites:** ${inviteData.total}`,
            `✅ **Regular:** ${inviteData.regular}`,
            `👋 **Left:** ${inviteData.left}`,
            `🚫 **Fake:** ${inviteData.fake}`,
            `🎁 **Bonus:** ${inviteData.bonus}`
        ].join('\n');

        const recentInvites = inviteData.invited?.slice(-5).reverse() || [];
        let recentText = '*No recent invites*';

        if (recentInvites.length > 0) {
            recentText = recentInvites.map(inv => `<@${inv.userId}> — <t:${Math.floor(inv.ts / 1000)}:R>`).join('\n');
        }

        container.addSectionComponents(section => {
            section.addTextDisplayComponents(td => td.setContent(statsText));
            section.setThumbnailAccessory(thumb => thumb.setURL(targetUser.displayAvatarURL({ dynamic: true })));
            return section;
        });

        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(`### 👥 Recent Invites\n${recentText}`));

        container.addTextDisplayComponents(td => td.setContent(`**UnderFive Studios** | <t:${Math.floor(Date.now() / 1000)}:R>`));

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};

