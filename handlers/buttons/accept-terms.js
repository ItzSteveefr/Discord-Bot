const config = require('../../config.json');

module.exports = {
    customId: 'accept_terms',

    async execute(interaction) {
        const { memberRoleId } = config;

        // Check if memberRoleId is configured
        if (!memberRoleId || memberRoleId === "MEMBER_ROLE_ID") {
            return await interaction.reply({
                content: '✅ **Terms accepted!** Welcome to the community!',
                flags: 64
            });
        }

        try {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const role = await interaction.guild.roles.fetch(memberRoleId);

            if (!role) {
                return await interaction.reply({
                    content: '❌ **Error!** Member role not found. Please contact an administrator.',
                    flags: 64
                });
            }

            // Check if user already has the role
            if (member.roles.cache.has(memberRoleId)) {
                return await interaction.reply({
                    content: '⚠️ **You already have this role!** Terms already accepted.',
                    flags: 64
                });
            }

            // Add role to member
            await member.roles.add(role);
            console.log(`✅ ${interaction.user.tag} accepted terms and received ${role.name} role.`);

            await interaction.reply({
                content: '✅ **Role assigned successfully!** Welcome to the community!',
                flags: 64
            });

        } catch (error) {
            console.error('❌ Accept terms error:', error);
            await interaction.reply({
                content: '❌ **Error!** Please try again or contact support.',
                flags: 64
            });
        }
    }
};
