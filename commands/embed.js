const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('../utils/componentBuilders');
const { buildEmbedBuilderUI, buildFinalMessage, parseEmbedCode, generateEmbedCode } = require('../utils/embedUtils');
const embedDb = require('../database/embedDb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Manage custom embeds (Components v2)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(sub =>
            sub.setName('create')
                .setDescription('Open the interactive embed builder')
        )
        .addSubcommand(sub =>
            sub.setName('send')
                .setDescription('Send an embed from code')
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send to').setRequired(true))
                .addStringOption(opt => opt.setName('code').setDescription('Embed code {title: ...}').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('edit')
                .setDescription('Edit an existing embed message')
                .addStringOption(opt => opt.setName('message_id').setDescription('ID of the message to edit').setRequired(true))
                .addStringOption(opt => opt.setName('code').setDescription('New embed code {title: ...}').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('copy')
                .setDescription('Get code from an existing embed message')
                .addStringOption(opt => opt.setName('message_id').setDescription('ID of the message to copy').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('variables')
                .setDescription('List available variables')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        // --- CREATE ---
        if (subcommand === 'create') {
            // Initialize or retrieve draft
            let draft = embedDb.getDraft(userId);
            if (!draft) {
                embedDb.saveDraft(userId, { title: null, description: null, fields: [] });
                draft = embedDb.getDraft(userId);
            }

            const container = buildEmbedBuilderUI(userId, draft);
            const data = container.toJSON();

            await interaction.reply({
                embeds: data.embeds,
                components: data.components,
                ephemeral: true
            });
        }

        // --- SEND ---
        else if (subcommand === 'send') {
            const channel = interaction.options.getChannel('channel');
            const code = interaction.options.getString('code');

            if (!channel.isTextBased()) {
                return interaction.reply({ content: '❌ Invalid channel type.', ephemeral: true });
            }

            // Check permissions in target channel
            if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
                return interaction.reply({ content: `❌ I don't have permission to send messages in ${channel}.`, ephemeral: true });
            }

            const context = { user: interaction.user, guild: interaction.guild, channel: channel };
            const embedData = parseEmbedCode(code, context);
            const messagePayload = buildFinalMessage(embedData);
            // messagePayload already contains embeds/components structure from buildFinalMessage logic update

            try {
                await channel.send(messagePayload);
                await interaction.reply({ content: `✅ Embed sent to ${channel}!`, ephemeral: true });
            } catch (error) {
                await interaction.reply({ content: `❌ Failed to send: ${error.message}`, ephemeral: true });
            }
        }

        // --- EDIT ---
        else if (subcommand === 'edit') {
            const messageId = interaction.options.getString('message_id');
            const code = interaction.options.getString('code');

            await interaction.deferReply({ ephemeral: true });

            try {
                // Try to find message in current channel, then all channels
                let targetMsg = null;
                try {
                    targetMsg = await interaction.channel.messages.fetch(messageId);
                } catch {
                    // Not in current channel
                }

                if (!targetMsg) {
                    // This is expensive, but necessary if we don't know the channel
                    // Alternatively, we could ask user for channel, but migration spec doesn't say so.
                    // Let's iterate cache for now or just fail.
                    // To be safe and efficient, we won't iterate all channels unless necessary.
                    // For now, let's assume it might be in the current channel or fail.
                    // Actually, let's try to find it if we can.
                    for (const [id, ch] of interaction.guild.channels.cache) {
                        if (ch.isTextBased() && ch.id !== interaction.channelId) {
                            try {
                                targetMsg = await ch.messages.fetch(messageId);
                                if (targetMsg) break;
                            } catch { }
                        }
                    }
                }

                if (!targetMsg) {
                    return interaction.editReply({ content: '❌ Message not found. Make sure the ID is correct.' });
                }

                if (targetMsg.author.id !== interaction.client.user.id) {
                    return interaction.editReply({ content: '❌ I can only edit my own messages.' });
                }

                const context = { user: interaction.user, guild: interaction.guild, channel: targetMsg.channel };
                const embedData = parseEmbedCode(code, context);
                const messagePayload = buildFinalMessage(embedData);
                // Components v2 edit needs flags? Usually flags are on the message object, typically reserved for ephemeral/suppress etc.
                // But for V2 components, we just send the components array.

                await targetMsg.edit({
                    content: messagePayload.content || null,
                    embeds: messagePayload.embeds,
                    components: messagePayload.components
                });

                await interaction.editReply({ content: `✅ Embed updated in ${targetMsg.channel}!` });

            } catch (error) {
                await interaction.editReply({ content: `❌ Failed to edit: ${error.message}` });
            }
        }

        // --- COPY ---
        else if (subcommand === 'copy') {
            const messageId = interaction.options.getString('message_id');
            await interaction.deferReply({ ephemeral: true });

            try {
                let targetMsg = null;
                try {
                    targetMsg = await interaction.channel.messages.fetch(messageId);
                } catch { }

                if (!targetMsg) {
                    for (const [id, ch] of interaction.guild.channels.cache) {
                        if (ch.isTextBased() && ch.id !== interaction.channelId) {
                            try {
                                targetMsg = await ch.messages.fetch(messageId);
                                if (targetMsg) break;
                            } catch { }
                        }
                    }
                }

                if (!targetMsg) {
                    return interaction.editReply({ content: '❌ Message not found.' });
                }

                // Extract data from message
                // This is tricky for Components v2 as we need to reverse-engineer the container/section structure.
                // Or if it was an old Embed, we can copy that easily.

                let data = {};

                // Check for standard embeds
                if (targetMsg.embeds.length > 0) {
                    const embed = targetMsg.embeds[0];
                    data = {
                        title: embed.title,
                        description: embed.description,
                        color: embed.color,
                        image: embed.image?.url,
                        thumbnail: embed.thumbnail?.url,
                        url: embed.url,
                        author: embed.author ? { name: embed.author.name, iconURL: embed.author.iconURL, url: embed.author.url } : null,
                        footer: embed.footer ? { text: embed.footer.text, iconURL: embed.footer.iconURL } : null,
                        fields: embed.fields || [],
                        timestamp: !!embed.timestamp
                    };
                } else {
                    // Try to parse components v2 "Embed-like" structure
                    // This is a naive attempt
                    // We look for text displays in the first component container
                    // This part is best-effort.
                    return interaction.editReply({ content: '❌ Copying strictly from Components v2 messages is experimental/not fully supported yet. Please copy from legacy Embeds for best results.' });
                }

                const code = generateEmbedCode(data);

                const container = new ContainerBuilder();
                container.addTextDisplayComponents(td => td.setContent(`# 📋 Copied Code\n\`\`\`\n${code}\n\`\`\``));
                container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(td => td.setContent(`**UnderFive Studios** | <t:${Math.floor(Date.now() / 1000)}:R>`));

                const payload = container.toJSON();
                await interaction.editReply({
                    embeds: payload.embeds,
                    components: payload.components
                });

            } catch (error) {
                await interaction.editReply({ content: `❌ Error: ${error.message}` });
            }
        }

        // --- VARIABLES ---
        else if (subcommand === 'variables') {
            const container = new ContainerBuilder();
            container.addTextDisplayComponents(td => td.setContent(`# ℹ️ Variables\n\n` +
                `**User:** \`{user}\`, \`{user.name}\`, \`{user.id}\`, \`{user.avatar}\`\n` +
                `**Server:** \`{guild.name}\`, \`{guild.icon}\`, \`{guild.membercount}\`, \`{guild.id}\`\n` +
                `**Channel:** \`{channel}\`, \`{channel.name}\`, \`{channel.id}\`\n` +
                `**Time:** \`{timestamp}\`, \`{timestamp.relative}\`\n`
            ));
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(td => td.setContent(`**UnderFive Studios** | <t:${Math.floor(Date.now() / 1000)}:R>`));

            const payload = container.toJSON();
            await interaction.reply({
                embeds: payload.embeds,
                components: payload.components,
                ephemeral: true
            });
        }
    }
};
