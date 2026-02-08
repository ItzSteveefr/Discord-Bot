const config = require('../config.json');
const db = require('../database/db.js');
const { getTimeoutWarningMessage, getAutoCloseMessage } = require('../messages/ticketPanel.js');
const { closeTicket } = require('./ticketUtils.js');

// Start timeout checker
function startTimeoutChecker(client) {
    const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

    console.log('⏰ Ticket timeout checker started (checking every 30 minutes)');

    setInterval(async () => {
        await checkTicketTimeouts(client);
    }, CHECK_INTERVAL);

    // First check after 5 minutes
    setTimeout(async () => {
        await checkTicketTimeouts(client);
    }, 5 * 60 * 1000);
}

// Timeout check function
async function checkTicketTimeouts(client) {
    const tickets = db.getActiveTickets();
    const now = Date.now();

    const WARNING_MS = (config.timeoutWarningHours || 24) * 60 * 60 * 1000;
    const CLOSE_MS = (config.timeoutAutoCloseHours || 48) * 60 * 60 * 1000;

    console.log(`⏰ Timeout check: ${tickets.length} active tickets`);

    for (const ticket of tickets) {
        // Skip if ticket status is not open
        if (ticket.status !== 'open') {
            console.log(`⏭️ Ticket #${ticket.ticketNumber} skipped (status: ${ticket.status})`);
            continue;
        }

        const lastActivity = ticket.lastActivityAt || ticket.createdAt;
        const elapsed = now - lastActivity;

        try {
            const channel = await client.channels.fetch(ticket.channelId).catch(() => null);

            if (!channel) {
                // Channel not found, clean from database
                db.closeTicket(ticket.channelId);
                console.log(`🗑️ Ticket #${ticket.ticketNumber} channel not found, cleaned.`);
                continue;
            }

            // Check if thread is archived or locked (already closed)
            if (channel.archived || channel.locked) {
                // Thread is closed, remove from database
                db.closeTicket(ticket.channelId);
                console.log(`🗑️ Ticket #${ticket.ticketNumber} is archived/locked, cleaned from database.`);
                continue;
            }

            // 48 hours passed and warned - Auto-close
            if (elapsed >= CLOSE_MS && ticket.warned) {
                await autoCloseTicket(client, channel, ticket);
            }
            // 24 hours passed but not warned yet
            else if (elapsed >= WARNING_MS && !ticket.warned) {
                await sendTimeoutWarning(channel, ticket);
            }

        } catch (error) {
            console.error(`Ticket #${ticket.ticketNumber} timeout check error:`, error);
        }
    }
}

// Send timeout warning
async function sendTimeoutWarning(channel, ticket) {
    try {
        // Double-check if channel is still open
        if (channel.archived || channel.locked) {
            console.log(`⏭️ Ticket #${ticket.ticketNumber} is closed, skipping warning.`);
            return;
        }

        const warningMessage = getTimeoutWarningMessage(ticket);
        await channel.send(warningMessage);

        // Mark as warned
        db.markAsWarned(ticket.channelId);

        console.log(`⚠️ Ticket #${ticket.ticketNumber} - 24 hour warning sent.`);
    } catch (error) {
        console.error('Timeout warning send error:', error);
    }
}

// Auto close - uses closeTicket which will edit the log message
async function autoCloseTicket(client, channel, ticket) {
    try {
        // Double-check if channel is still open
        if (channel.archived || channel.locked) {
            console.log(`⏭️ Ticket #${ticket.ticketNumber} is already closed, skipping auto-close.`);
            db.closeTicket(ticket.channelId);
            return;
        }

        // Send auto-close message
        const closeMessage = getAutoCloseMessage(ticket);
        await channel.send(closeMessage);

        // Close the ticket (this will also edit the log message)
        await closeTicket(channel, null, null);

        console.log(`🔒 Ticket #${ticket.ticketNumber} auto-closed (48 hours of inactivity).`);

    } catch (error) {
        console.error('Auto-close error:', error);
    }
}

module.exports = {
    startTimeoutChecker,
    checkTicketTimeouts
};
