const { SlashCommandBuilder } = require('discord.js'); // Assuming DJS v13/14
const { ContainerBuilder, TextDisplayBuilder, ButtonStyle, SeparatorSpacingSize } = require('../utils/componentBuilders.js');
const { ButtonBuilder } = require('discord.js');
const { EMOJIS } = require('../utils/migrationUtils.js');
const db = require('../database/db.js');

const COMPONENT_IDS = {
    ping_refresh: 'ping_refresh',
    membercount_refresh: 'membercount_refresh'
};

/* --- Helpers --- */
async function getDbPing(client) {
    const start = Date.now();
    // Simulate DB operation
    db.findOne({ guildId: 'ping' });
    const ping = Date.now() - start;
    return { type: 'json', ping };
}

async function buildPingComponents(client, state = 'active', dbPing = null, dbType = 'json') {
    const latency = Math.round(client.ws.ping);
    let dbPingText = dbPing !== null ? `\n**Database** (${dbType}): ${dbPing}ms` : '';

    // Using ContainerBuilder
    const container = new ContainerBuilder()
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
                state === 'active'
                    ? `**${EMOJIS.ping} Current gateway latency: ${latency}ms**${dbPingText}`
                    : 'Ping check closed.'
            )
        )
        .addSeparatorComponents((separator) =>
            separator.setSpacing(SeparatorSpacingSize.Small)
        )
        .addActionRowComponents((actionRow) =>
            actionRow.setComponents(
                new ButtonBuilder()
                    .setCustomId(COMPONENT_IDS.ping_refresh)
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Primary)
            )
        );

    // Footer
    container.addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent("**UnderFive Studios** • Discord Automation")
    );

    return [container];
}

async function buildMemberCountComponents(guild, state = 'active') {
    try { await guild.members.fetch(); } catch { }

    const totalMembers = guild.memberCount;
    const humans = guild.members.cache.filter(member => !member.user.bot).size;
    const bots = guild.members.cache.filter(member => member.user.bot).size;
    const humanPercent = totalMembers > 0 ? ((humans / totalMembers) * 100).toFixed(1) : 0;
    const botPercent = totalMembers > 0 ? ((bots / totalMembers) * 100).toFixed(1) : 0;

    const container = new ContainerBuilder()
        .addTextDisplayComponents(td =>
            td.setContent(`# ${EMOJIS.members} Member Statistics`)
        )
        .addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(td =>
            td.setContent(
                `${EMOJIS.users} **Total Members:** \`${totalMembers.toLocaleString()}\`\n\n` +
                `${EMOJIS.members} **Humans:** \`${humans.toLocaleString()}\` *(${humanPercent}%)*\n` +
                `${EMOJIS.bot} **Bots:** \`${bots.toLocaleString()}\` *(${botPercent}%)*`
            )
        )
        .addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(actionRow =>
            actionRow.setComponents(
                new ButtonBuilder()
                    .setCustomId(COMPONENT_IDS.membercount_refresh)
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(EMOJIS.refresh)
                    .setDisabled(state !== 'active')
            )
        );

    // Footer
    container.addTextDisplayComponents(td =>
        td.setContent("**UnderFive Studios** • Discord Automation")
    );

    return [container];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('general')
        .setDescription('General commands')
        .addSubcommand(sub =>
            sub.setName('ping')
                .setDescription('Check the bot latency.')
        )
        .addSubcommand(sub =>
            sub.setName('membercount')
                .setDescription('Shows the total member count.')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'ping') {
            const { type: dbType, ping: dbPing } = await getDbPing(interaction.client);
            const components = await buildPingComponents(interaction.client, 'active', dbPing, dbType);

            const container = (await buildPingComponents(interaction.client, 'active', dbPing, dbType))[0];
            const data = container.toJSON();

            await interaction.reply({
                embeds: data.embeds,
                components: data.components,
                ephemeral: true
            });
        } else if (subcommand === 'membercount') {
            const components = await buildMemberCountComponents(interaction.guild);
            const container = (await buildMemberCountComponents(interaction.guild))[0];
            const data = container.toJSON();

            await interaction.reply({
                embeds: data.embeds,
                components: data.components
            });
        }
    },

    // Exports for button handlers logic reused
    buildPingComponents,
    buildMemberCountComponents,
    getDbPing
};
