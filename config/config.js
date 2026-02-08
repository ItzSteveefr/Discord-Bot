/**
 * UnderFive Studios Discord Bot Configuration
 * Contains brand colors, ticket categories, and default settings
 */

// Brand Colors - Used throughout the bot for consistent styling
const BRAND_COLORS = {
    primary: 0x5865F2,    // Discord Blurple
    secondary: 0x57F287,  // Green - Success
    accent: 0xFEE75C,     // Yellow - Warning
    error: 0xED4245,      // Red - Error
    info: 0x5865F2,       // Blue - Information
    ticket: 0x3498DB,     // Ticket Blue
    premium: 0xF1C40F,    // Gold - Premium
    dark: 0x2C2F33,       // Dark Gray
    light: 0x99AAB5       // Light Gray
};

// Ticket Categories Configuration
const TICKET_CATEGORIES = {
    plugin_support: {
        name: 'Plugin Support',
        emoji: '🔧',
        color: BRAND_COLORS.primary,
        description: 'Get help with purchased plugins',
        autoMessage: 'Thank you for contacting plugin support. Please provide:\n• Plugin name\n• Version number\n• Description of the issue\n• Any error messages'
    },
    purchase_issue: {
        name: 'Purchase Issue',
        emoji: '💳',
        color: BRAND_COLORS.premium,
        description: 'Problems with purchases or payments',
        autoMessage: 'Our billing team will assist you shortly. Please provide:\n• Transaction ID\n• Date of purchase\n• Issue description'
    },
    technical_help: {
        name: 'Technical Help',
        emoji: '⚙️',
        color: BRAND_COLORS.info,
        description: 'Technical questions and troubleshooting',
        autoMessage: 'Technical support is here to help! Please share:\n• Server version\n• Operating system\n• Detailed description'
    },
    general: {
        name: 'General Question',
        emoji: '❓',
        color: BRAND_COLORS.secondary,
        description: 'Other questions or inquiries',
        autoMessage: 'How can we help you today? Please describe your question.'
    }
};

// 8Ball Responses
const EIGHT_BALL_RESPONSES = [
    { text: 'It is certain.', positive: true },
    { text: 'Without a doubt.', positive: true },
    { text: 'Yes, definitely.', positive: true },
    { text: 'You may rely on it.', positive: true },
    { text: 'As I see it, yes.', positive: true },
    { text: 'Most likely.', positive: true },
    { text: 'Outlook good.', positive: true },
    { text: 'Yes.', positive: true },
    { text: 'Signs point to yes.', positive: true },
    { text: 'Reply hazy, try again.', positive: null },
    { text: 'Ask again later.', positive: null },
    { text: 'Better not tell you now.', positive: null },
    { text: 'Cannot predict now.', positive: null },
    { text: 'Concentrate and ask again.', positive: null },
    { text: "Don't count on it.", positive: false },
    { text: 'My reply is no.', positive: false },
    { text: 'My sources say no.', positive: false },
    { text: 'Outlook not so good.', positive: false },
    { text: 'Very doubtful.', positive: false }
];

// Poke GIFs - Collection of anime poke GIFs
const POKE_GIFS = [
    'https://media.tenor.com/XFJd2ilJQKkAAAAC/anime-poke.gif',
    'https://media.tenor.com/5-2TP_sA8GgAAAAC/anime-poke.gif',
    'https://media.tenor.com/m7Z5XYNBDHMAAAAC/anime-poke.gif',
    'https://media.tenor.com/KnlDsL9EgmQAAAAC/anime-poke.gif',
    'https://media.tenor.com/z8vZs63YLT4AAAAC/poke-anime.gif'
];

// Bot Settings
const BOT_SETTINGS = {
    embedFooter: 'UnderFive Studios • Premium Plugins Under $5',
    supportMessage: 'Need help? Create a ticket!',
    defaultCooldown: 3, // seconds
    maxWarnings: 5, // before auto-action
    ticketPrefix: 'ticket-'
};

module.exports = {
    BRAND_COLORS,
    TICKET_CATEGORIES,
    EIGHT_BALL_RESPONSES,
    POKE_GIFS,
    BOT_SETTINGS
};
