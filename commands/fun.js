const {
    SlashCommandBuilder,
    AttachmentBuilder
} = require('discord.js');
const {
    ContainerBuilder,
    MessageFlags,
    MediaGalleryBuilder,
    SeparatorSpacingSize
} = require('../utils/componentBuilders.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const EMOJIS = require('../utils/emojis.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fun')
        .setDescription('Fun commands for your entertainment')
        .addSubcommand(subcommand =>
            subcommand
                .setName('8ball')
                .setDescription('Ask the magic 8ball a question')
                .addStringOption(option =>
                    option.setName('question')
                        .setDescription('The question you want to ask')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('choose')
                .setDescription('Randomly picks one option from a list separated by |')
                .addStringOption(option =>
                    option.setName('options')
                        .setDescription('Options separated by | (e.g. Pizza | Burger)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hack')
                .setDescription('Simulates hacking a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to hack')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rate')
                .setDescription('Rates a user or text on a scale of 0-100')
                .addStringOption(option =>
                    option.setName('target')
                        .setDescription('User or text to rate')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('roll')
                .setDescription('Rolls a dice between 1 and a specified limit')
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('The maximum number to roll (default 100)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ship')
                .setDescription('Calculates compatibility between two users')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to ship with')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('user2')
                        .setDescription('Optional second user (defaults to you)')
                        .setRequired(false))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === '8ball') {
            await handle8ball(interaction);
        } else if (subcommand === 'choose') {
            await handleChoose(interaction);
        } else if (subcommand === 'hack') {
            await handleHack(interaction);
        } else if (subcommand === 'rate') {
            await handleRate(interaction);
        } else if (subcommand === 'roll') {
            await handleRoll(interaction);
        } else if (subcommand === 'ship') {
            await handleShip(interaction);
        }
    }
};

async function handle8ball(interaction) {
    const question = interaction.options.getString('question');
    const responses = [
        'It is certain.', 'It is decidedly so.', 'Without a doubt.', 'Yes - definitely.',
        'You may rely on it.', 'As I see it, yes.', 'Most likely.', 'Outlook good.',
        'Yes.', 'Signs point to yes.', 'Reply hazy, try again.', 'Ask again later.',
        'Better not tell you now.', 'Cannot predict now.', 'Concentrate and ask again.',
        'Don\'t count on it.', 'My reply is no.', 'My sources say no.',
        'Outlook not so good.', 'Very doubtful.'
    ];

    const answer = responses[Math.floor(Math.random() * responses.length)];

    const container = new ContainerBuilder()
        .addTextDisplayComponents(td =>
            td.setContent(`**🎱 8-Ball**\n\n**Question:** ${question}\n**Answer:** ${answer}`)
        )
        .addTextDisplayComponents(td =>
            td.setContent(`**UnderFive Studios** • Discord Automation`)
        );

    const data = container.toJSON();
    await interaction.reply({
        embeds: data.embeds,
        components: data.components
    });
}

async function handleChoose(interaction) {
    const input = interaction.options.getString('options');
    const options = input.split('|').map(o => o.trim()).filter(o => o.length > 0);

    if (options.length < 2) {
        return interaction.reply({
            content: `${EMOJIS.error || '❌'} Please provide at least two options separated by |`,
            flags: MessageFlags.Ephemeral
        });
    }

    const choice = options[Math.floor(Math.random() * options.length)];

    const container = new ContainerBuilder()
        .addTextDisplayComponents(td =>
            td.setContent(`**🤔 I choose...**\n\n✨ **${choice}**`)
        )
        .addTextDisplayComponents(td =>
            td.setContent(`**UnderFive Studios** • Discord Automation`)
        );

    const data = container.toJSON();
    await interaction.reply({
        embeds: data.embeds,
        components: data.components
    });
}

async function handleHack(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetName = targetUser.username;

    const steps = [
        `💻 Initializing hack tool v2.0...`,
        `🔍 Finding **${targetName}**'s IP address...`,
        `🔓 Bypassing firewall... (Success)`,
        `📂 Downloading "homework" folder...`,
        `📧 Reading latest DMs... (Oof)`,
        `💸 Stealing Discord nitro tokens...`,
        `⚠️ Injecting trojan...`,
        `✅ **Hacking Complete!** Stole 0 data because I'm a good bot.`
    ];

    const container = new ContainerBuilder()
        .addTextDisplayComponents(td => td.setContent(`🎲 **Hacking ${targetName}**\n\n${steps[0]}`))
        .addTextDisplayComponents(td => td.setContent(`**UnderFive Studios** • Discord Automation`));

    const data = container.toJSON();
    await interaction.reply({
        embeds: data.embeds,
        components: data.components
    });

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    try {
        for (let i = 1; i < steps.length; i++) {
            await sleep(2000);
            const newContainer = new ContainerBuilder()
                .addTextDisplayComponents(td => {
                    const log = steps.slice(0, i + 1).join('\n');
                    return td.setContent(`🎲 **Hacking ${targetName}**\n\n${log}`);
                })
                .addTextDisplayComponents(td => td.setContent(`**UnderFive Studios** • Discord Automation`));

            const data = newContainer.toJSON();
            await interaction.editReply({
                embeds: data.embeds,
                components: data.components
            });
        }
    } catch (e) {
        console.log('Hack sim interrupted', e);
    }
}

async function handleRate(interaction) {
    let subject = interaction.options.getString('target');

    if (!subject) {
        subject = interaction.user.username;
    } else if (subject.startsWith('<@')) {
        // Since we take string input for flexibility (text or user), we might want to resolve mentions if passed as text
        // But slash commands handle user inputs better via UserOption. 
        // Current requirement matches old "rate [user/text]" behavior. 
        // If it's a mention string, let's keep it as is, or try to clean it.
        // For simplicity and matching "text", we use the string as provided.
    }

    const score = Math.floor(Math.random() * 101);
    const filled = Math.round((score / 100) * 5);
    const stars = '★'.repeat(filled) + '☆'.repeat(5 - filled);

    const container = new ContainerBuilder()
        .addTextDisplayComponents(td =>
            td.setContent(`**📝 Rating**\n\nI rate **${subject}**\n**${score}/100**\n${stars}`)
        )
        .addTextDisplayComponents(td =>
            td.setContent(`**UnderFive Studios** • Discord Automation`)
        );

    const data = container.toJSON();
    await interaction.reply({
        embeds: data.embeds,
        components: data.components
    });
}

async function handleRoll(interaction) {
    let limit = interaction.options.getInteger('limit') || 100;
    if (limit < 1) limit = 100;

    const result = Math.floor(Math.random() * limit) + 1;

    const container = new ContainerBuilder()
        .addTextDisplayComponents(td =>
            td.setContent(`**🎲 Dice Roll**\n\nYou rolled a **${result}** (1-${limit})`)
        )
        .addTextDisplayComponents(td =>
            td.setContent(`**UnderFive Studios** • Discord Automation`)
        );

    const data = container.toJSON();
    await interaction.reply({
        embeds: data.embeds,
        components: data.components
    });
}

async function handleShip(interaction) {
    await interaction.deferReply();

    const user1 = interaction.user;
    const targetUser = interaction.options.getUser('user');
    const targetUser2 = interaction.options.getUser('user2');

    let shipUser1 = user1;
    let shipUser2 = targetUser;

    if (targetUser2) {
        shipUser1 = targetUser;
        shipUser2 = targetUser2;
    }

    // Special pair logic from original code
    const specialId = '1417438096185757748';
    // Access client from interaction
    const client = interaction.client;
    const owners = client.ownerIds || client.config?.ownerIds || [];

    const isOwner1 = owners.includes(shipUser1.id);
    const isOwner2 = owners.includes(shipUser2.id);
    const isSpecial1 = shipUser1.id === specialId;
    const isSpecial2 = shipUser2.id === specialId;

    const isSpecialPair = (isOwner1 && isSpecial2) || (isOwner2 && isSpecial1);
    const score = isSpecialPair ? 100 : Math.floor(Math.random() * 101);
    const progress = Math.round(score / 10);
    const bar = '🟥'.repeat(progress) + '⬜'.repeat(10 - progress);

    let comment;
    if (score === 100) comment = '💖 **Soulmates!** Tying the knot when? 💍';
    else if (score > 90) comment = '😍 **Perfect Match!** Love is in the air!';
    else if (score > 75) comment = '🥰 **Great Couple!** Definitely compatible.';
    else if (score > 50) comment = '🙂 **Good Chance.** Give it a shot!';
    else if (score > 25) comment = '😬 **Maybe?** It might take some work.';
    else if (score > 10) comment = '💔 **Not looking good.** Friendzone territory.';
    else comment = '💀 **Run away!** Disaster imminent.';

    const container = new ContainerBuilder()
        .addTextDisplayComponents(td => td.setContent(`# 💘 Matchmaking 💘`))
        .addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(td =>
            td.setContent(`🔻 **${shipUser1.username}**\n🔺 **${shipUser2.username}**\n\n**${score}%** ${bar}`)
        );

    let attachment;
    try {
        const canvas = createCanvas(700, 250);
        const ctx = canvas.getContext('2d');

        const avatar1URL = shipUser1.displayAvatarURL({ extension: 'png', forceStatic: true, size: 256 });
        const avatar2URL = shipUser2.displayAvatarURL({ extension: 'png', forceStatic: true, size: 256 });

        const avatar1Buffer = await fetch(avatar1URL).then(res => res.arrayBuffer());
        const avatar2Buffer = await fetch(avatar2URL).then(res => res.arrayBuffer());

        const avatar1 = await loadImage(Buffer.from(avatar1Buffer));
        const avatar2 = await loadImage(Buffer.from(avatar2Buffer));

        ctx.save();
        ctx.beginPath();
        ctx.arc(125, 125, 100, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar1, 25, 25, 200, 200);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(575, 125, 100, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar2, 475, 25, 200, 200);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(350, 125, 60, 0, Math.PI * 2, true);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();
        ctx.restore();

        // Font registration logic
        const fontName = 'ShipFont';
        if (!GlobalFonts.families.some(f => f.family === fontName)) {
            const fontPaths = [
                'C:/Windows/Fonts/arial.ttf',
                'C:/Windows/Fonts/arialbd.ttf',
                'C:/Windows/Fonts/segoeui.ttf',
                '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
                '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
            ];

            for (const fontPath of fontPaths) {
                try {
                    GlobalFonts.registerFromPath(fontPath, fontName);
                    break;
                } catch {
                    // Ignore font load errors, try next
                }
            }
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold 40px "${fontName}"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${score}%`, 350, 125);

        attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'ship.png' });

        const gallery = new MediaGalleryBuilder();
        gallery.addItems((item) => item.setURL('attachment://ship.png'));

        container.addMediaGalleryComponents((mg) => gallery);

    } catch (e) {
        console.error('[Ship] Canvas error:', e);
        container.addTextDisplayComponents(td =>
            td.setContent(`⚠️ **Image generation failed**, but the love is real!`)
        );
    }

    container.addTextDisplayComponents(td => td.setContent(`### ${comment}`))
        .addTextDisplayComponents(td => td.setContent(`**UnderFive Studios** • Discord Automation`));

    const data = container.toJSON();
    const replyOptions = {
        embeds: data.embeds,
        components: data.components
    };

    if (attachment) {
        replyOptions.files = [attachment];
    }

    await interaction.editReply(replyOptions);
}
