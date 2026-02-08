const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ContainerBuilder, SeparatorSpacingSize } = require('../utils/componentBuilders.js');
const moderationDb = require('../database/moderationDb.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Manage channel locking')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(sub =>
            sub.setName('channel')
                .setDescription('Lock or unlock a specific channel')
                .addStringOption(option =>
                    option.setName('state')
                        .setDescription('Lock state')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Lock', value: 'lock' },
                            { name: 'Unlock', value: 'unlock' }
                        )
                )
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to manage (defaults to current)')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('server')
                .setDescription('Lock or unlock ALL channels')
                .addStringOption(option =>
                    option.setName('state')
                        .setDescription('Lock state')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Lock', value: 'lock' },
                            { name: 'Unlock', value: 'unlock' }
                        )
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('ignore')
                .setDescription('Manage ignored channels for server lock')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' },
                            { name: 'List', value: 'list' }
                        )
                )
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to ignore')
                        .setRequired(false)
                )
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const container = new ContainerBuilder().setAccentColor(0x5865F2);

        if (subcommand === 'channel') {
            const state = interaction.options.getString('state');
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const everyoneRole = interaction.guild.roles.everyone;

            try {
                if (state === 'lock') {
                    await targetChannel.permissionOverwrites.edit(everyoneRole, { SendMessages: false });
                    container.setAccentColor(0xFF0000);
                    container.addTextDisplayComponents(td => td.setContent(`# 🔒 Channel Locked`));
                    container.addTextDisplayComponents(td => td.setContent(`**Channel:** ${targetChannel}\n**Reason:** ${reason}`));

                    const notif = new ContainerBuilder()
                        .setAccentColor(0xFF0000)
                        .addTextDisplayComponents(td => td.setContent(`# 🔒 Channel Locked`))
                        .addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
                        .addTextDisplayComponents(td => td.setContent(`This channel has been locked.\n**Reason:** ${reason}`));

                    const notifData = notif.toJSON();
                    await targetChannel.send({ embeds: notifData.embeds, components: notifData.components }).catch(() => { });

                } else {
                    await targetChannel.permissionOverwrites.edit(everyoneRole, { SendMessages: null });
                    container.setAccentColor(0x57F287);
                    container.addTextDisplayComponents(td => td.setContent(`# 🔓 Channel Unlocked`));
                    container.addTextDisplayComponents(td => td.setContent(`**Channel:** ${targetChannel}\n**Reason:** ${reason}`));

                    const notif = new ContainerBuilder()
                        .setAccentColor(0x57F287)
                        .addTextDisplayComponents(td => td.setContent(`# 🔓 Channel Unlocked`))
                        .addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
                        .addTextDisplayComponents(td => td.setContent(`This channel has been unlocked.\n**Reason:** ${reason}`));

                    const notifData = notif.toJSON();
                    await targetChannel.send({ embeds: notifData.embeds, components: notifData.components }).catch(() => { });
                }

                const data = container.toJSON();
                await interaction.reply({ embeds: data.embeds, components: data.components });

                moderationDb.addAction(interaction.guild.id, {
                    type: state === 'lock' ? 'lock' : 'unlock',
                    channelId: targetChannel.id,
                    moderator: { id: interaction.user.id },
                    reason
                });

            } catch (error) {
                console.error(error);
                await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
            }

        } else if (subcommand === 'server') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Administrator permissions required for server lock.', ephemeral: true });
            }

            const state = interaction.options.getString('state');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            await interaction.deferReply();

            const ignored = moderationDb.getLockIgnores(interaction.guild.id);
            const channels = interaction.guild.channels.cache.filter(c =>
                c.isTextBased() && !ignored.includes(c.id) && !c.isThread()
            );

            let count = 0;
            const everyoneRole = interaction.guild.roles.everyone;

            for (const [id, channel] of channels) {
                try {
                    if (state === 'lock') {
                        await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false });
                    } else {
                        await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null });
                    }
                    count++;
                } catch (e) {
                    console.warn(`Failed to ${state} ${channel.name}`);
                }
            }

            container.addTextDisplayComponents(td => td.setContent(`# ${state === 'lock' ? '🔒' : '🔓'} Server ${state === 'lock' ? 'Lockdown' : 'Unlocked'}`));
            container.addTextDisplayComponents(td => td.setContent(`Processed **${count}** channels.\n**Reason:** ${reason}`));

            const data = container.toJSON();
            await interaction.editReply({ embeds: data.embeds, components: data.components });

        } else if (subcommand === 'ignore') {
            const action = interaction.options.getString('action');

            if (action === 'list') {
                const ignored = moderationDb.getLockIgnores(interaction.guild.id);
                container.addTextDisplayComponents(td => td.setContent(`# 🛡️ Ignored Channels`));
                container.addTextDisplayComponents(td => td.setContent(ignored.length ? ignored.map(id => `<#${id}>`).join('\n') : 'No channels ignored.'));
                const data = container.toJSON();
                return interaction.reply({ embeds: data.embeds, components: data.components });
            }

            const target = interaction.options.getChannel('channel');
            if (!target) return interaction.reply({ content: '❌ Channel required for add/remove.', ephemeral: true });

            if (action === 'add') {
                const added = moderationDb.addLockIgnore(interaction.guild.id, target.id);
                container.addTextDisplayComponents(td => td.setContent(added ? `✅ Added ${target} to ignore list.` : `⚠️ ${target} is already ignored.`));
            } else {
                const removed = moderationDb.removeLockIgnore(interaction.guild.id, target.id);
                container.addTextDisplayComponents(td => td.setContent(removed ? `✅ Removed ${target} from ignore list.` : `⚠️ ${target} was not in ignore list.`));
            }

            const data = container.toJSON();
            await interaction.reply({ embeds: data.embeds, components: data.components });
        }
    }
};
