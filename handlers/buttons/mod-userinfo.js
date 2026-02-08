const { EmbedBuilder } = require('discord.js');

module.exports = {
    customId: 'userinfo_',

    async execute(interaction) {
        const userId = interaction.customId.replace('userinfo_', '');

        try {
            const user = await interaction.client.users.fetch(userId);
            if (!user) {
                return await interaction.reply({
                    content: '❌ **User not found!**',
                    flags: 64
                });
            }

            // Try to get member info
            let memberInfo = '';
            let inServer = false;
            try {
                const member = await interaction.guild.members.fetch(userId);
                if (member) {
                    inServer = true;
                    const roles = member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.toString()).slice(0, 5).join(', ') || 'None';
                    memberInfo = `\n📅 **Joined Server:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n🎭 **Roles:** ${roles}`;
                }
            } catch (e) {
                memberInfo = '\n⚠️ User is not in the server';
            }

            const embed = new EmbedBuilder()
                .setTitle('ℹ️ User Information')
                .setColor('#5865F2')
                .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
                .setDescription(`**${user.tag}**\n\n🔑 **User ID:** \`${user.id}\`\n📅 **Account Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:F>\n🤖 **Bot:** ${user.bot ? 'Yes' : 'No'}${memberInfo}`)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                flags: 64
            });

        } catch (error) {
            console.error('User info error:', error);
            await interaction.reply({
                content: '❌ **Error fetching user information!**',
                flags: 64
            });
        }
    }
};
