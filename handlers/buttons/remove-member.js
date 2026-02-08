const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const db = require('../../database/db.js');

module.exports = {
    customId: 'remove_member',

    async execute(interaction) {
        const ticket = db.getTicket(interaction.channel.id);

        if (!ticket) {
            return await interaction.reply({
                content: '❌ This channel is not a ticket!',
                flags: 64
            });
        }

        // Get thread members
        const threadMembers = await interaction.channel.members.fetch();
        const members = [];

        for (const [memberId, threadMember] of threadMembers) {
            // Exclude bot and ticket owner
            if (memberId === interaction.client.user.id) continue;
            if (memberId === ticket.userId) continue;

            try {
                const user = await interaction.client.users.fetch(memberId);
                members.push({
                    label: user.tag,
                    value: memberId,
                    description: `ID: ${memberId}`
                });
            } catch (e) {
                // User not found
            }
        }

        if (members.length === 0) {
            return await interaction.reply({
                content: '❌ No users available to remove!',
                flags: 64
            });
        }

        // Create select menu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('remove_user_select')
            .setPlaceholder('Select a user to remove...')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(members.slice(0, 25)); // Max 25 options

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            content: '👤 **Select the user you want to remove from the ticket:**',
            components: [row],
            flags: 64
        });
    }
};
