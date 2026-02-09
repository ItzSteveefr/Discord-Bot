const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const db = require('../../database/db.js');
const config = require('../../config.json');

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

        // Get channel permission overwrites (for channel-based tickets)
        const permissionOverwrites = interaction.channel.permissionOverwrites.cache;
        const members = [];

        for (const [id, overwrite] of permissionOverwrites) {
            // Skip @everyone role (guild ID)
            if (id === interaction.guild.id) continue;

            // Skip bot
            if (id === interaction.client.user.id) continue;

            // Skip ticket owner
            if (id === ticket.userId) continue;

            // Skip support role
            if (id === config.supportRoleId) continue;

            // Check if this is a user (not a role)
            try {
                const user = await interaction.client.users.fetch(id);
                if (user) {
                    members.push({
                        label: user.tag,
                        value: id,
                        description: `ID: ${id}`
                    });
                }
            } catch (e) {
                // Not a user, might be a role - skip it
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
