/**
 * Winston Logger Configuration
 * Handles all logging for the UnderFive Studios Discord Bot
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
        return `[${timestamp}] ${level}: ${message}${metaStr}`;
    })
);

// Custom format for file output
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: 'underfive-bot' },
    transports: [
        // Error logs - separate file for easy monitoring
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Combined logs - all levels
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Console output for development
        new winston.transports.Console({
            format: consoleFormat
        })
    ]
});

// Add methods for common bot logging scenarios
logger.command = (commandName, userId, guildId, success = true) => {
    logger.info(`Command executed: ${commandName}`, {
        command: commandName,
        userId,
        guildId,
        success
    });
};

logger.event = (eventName, details = {}) => {
    logger.debug(`Event triggered: ${eventName}`, {
        event: eventName,
        ...details
    });
};

logger.database = (operation, collection, success = true, details = {}) => {
    const level = success ? 'debug' : 'error';
    logger[level](`Database ${operation}: ${collection}`, {
        operation,
        collection,
        success,
        ...details
    });
};

logger.api = (endpoint, statusCode, responseTime) => {
    logger.debug(`API request: ${endpoint}`, {
        endpoint,
        statusCode,
        responseTime
    });
};

module.exports = logger;
