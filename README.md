# Speaw Ticket Bot 🎫

Modern Discord ticket bot built with Discord.js v14 and Components V3 support.

## Features

- 🎫 **Sub-Category System** - General Support, Technical Support, Pre-Sales, Complaint, and more.
- ⏰ **Timeout Mechanism** - 24-hour inactivity warning and 48-hour auto-close.
- ⭐ **Rating System** - 1-5 star rating system for closed tickets to measure satisfaction.
- 📊 **Live Statistics** - Track active tickets, total created, and average ratings.
- 🔔 **Support Call** - One-click button to notify the support team.
- 🧵 **Private Threads** - Every ticket is handled in a secure private thread.
- 📝 **Detailed Logging** - Comprehensive logging for all ticket-related actions.

## Installation

### 1. Install Dependencies
```bash
cd speaw
npm install
```

### 2. Configuration
Edit the `config.json` file with your bot details:

```json
{
    "token": "YOUR_BOT_TOKEN",
    "clientId": "YOUR_CLIENT_ID",
    "guildId": "YOUR_GUILD_ID",
    
    "ticketPanelChannelId": "TICKET_PANEL_CHANNEL_ID",
    "ticketCategoryId": "TICKET_CATEGORY_ID",
    "ticketLogChannelId": "TICKET_LOG_CHANNEL_ID",
    "supportRoleId": "SUPPORT_ROLE_ID"
}
```

### 3. Register Slash Commands
```bash
npm run deploy
# or
node deploy-commands.js
```

### 4. Start the Bot
```bash
npm start
# or
node index.js
```

## Slash Commands

| Command | Description |
|-------|----------|
| `/ticket-setup` | Sends the ticket panel to the current channel (Admin) |
| `/ticket-close` | Closes the current ticket |
| `/ticket-add` | Adds a user to the ticket |
| `/ticket-remove` | Removes a user from the ticket |
| `/ticket-rename` | Renames the current ticket |
| `/ticket-stats` | Displays ticket statistics |

## Categories

Categories can be managed in `categories/categories.json`:

- **General Support** 📋 - General questions and assistance.
- **Technical Support** 🔧 - Technical issues and bug reporting.
- **Pre-Sales** 💰 - Pre-purchase inquiries.
- **Complaint** ⚠️ - Feedback and complaints.
- **Other** 📝 - Miscellaneous topics.

## Requirements

- Node.js 18+
- Discord.js 14.21+
- A valid Discord Bot Token

## License

This project is licensed under the **Speaway License**.
