const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete')
        .setDescription('Delete messages with various filters')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Filter by user')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('filter')
                .setDescription('Apply a filter')
                .setRequired(false)
                .addChoices(
                    { name: 'Bots Only', value: 'bots' },
                    { name: 'Humans Only', value: 'humans' },
                    { name: 'Embeds Only', value: 'embeds' },
                    { name: 'Files Only', value: 'files' },
                    { name: 'Images Only', value: 'images' },
                    { name: 'Links Only', value: 'links' },
                    { name: 'Pins Only', value: 'pins' }
                )
        ),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');
        const filter = interaction.options.getString('filter');

        const container = new ContainerBuilder().setAccentColor(0x5865F2);

        if (!interaction.channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
            container.addTextDisplayComponents(td => td.setContent(`# ❌ Missing Permissions`));
            container.addTextDisplayComponents(td => td.setContent(`I need **Manage Messages** permission to execute this.`));
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            let filtered = messages;

            if (targetUser) {
                filtered = filtered.filter(m => m.author.id === targetUser.id);
            }

            if (filter) {
                switch (filter) {
                    case 'bots': filtered = filtered.filter(m => m.author.bot); break;
                    case 'humans': filtered = filtered.filter(m => !m.author.bot); break;
                    case 'embeds': filtered = filtered.filter(m => m.embeds.length > 0); break;
                    case 'files': filtered = filtered.filter(m => m.attachments.size > 0); break;
                    case 'images': filtered = filtered.filter(m => m.attachments.some(a => a.contentType && a.contentType.startsWith('image/'))); break;
                    case 'links': filtered = filtered.filter(m => /(https?:\/\/[^\s]+)/g.test(m.content)); break;
                    case 'pins': filtered = filtered.filter(m => m.pinned); break;
                }
            }

            if (filter !== 'pins') {
                filtered = filtered.filter(m => !m.pinned);
            }

            const toDelete = Array.from(filtered.values()).slice(0, amount);

            if (toDelete.length === 0) {
                container.addTextDisplayComponents(td => td.setContent(`# ⚠️ No Messages Found`));
                container.addTextDisplayComponents(td => td.setContent(`No matching messages found to delete.`));
                return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
            }

            await interaction.channel.bulkDelete(toDelete, true);

            container.addTextDisplayComponents(td => td.setContent(`# 🗑️ Messages Deleted`));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

            let info = `**Total:** ${toDelete.length} message(s)`;
            if (targetUser) info += `\n**User:** ${targetUser}`;
            if (filter) info += `\n**Filter:** ${filter}`;

            container.addTextDisplayComponents(td => td.setContent(info));
            container.addTextDisplayComponents(td => td.setContent(`**UnderFive Studios** | <t:${Math.floor(Date.now() / 1000)}:R>`));

            await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            console.error(error);
            container.addTextDisplayComponents(td => td.setContent(`# ❌ Error`));
            container.addTextDisplayComponents(td => td.setContent(`An error occurred: ${error.message}`));
            await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    }
};

