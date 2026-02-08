/**
 * Rate Limiter Utility
 * Prevents command spam and API abuse
 */

// Store rate limit data in memory
const rateLimits = new Map();

/**
 * Check if a user is rate limited for a specific command
 * @param {string} userId - The user's Discord ID
 * @param {string} commandName - The command being executed
 * @param {number} maxUses - Maximum uses allowed in the time window
 * @param {number} timeWindow - Time window in milliseconds
 * @returns {Object} { limited: boolean, resetIn?: number }
 */
const checkRateLimit = (userId, commandName, maxUses = 3, timeWindow = 60000) => {
    const key = `${userId}-${commandName}`;
    const now = Date.now();

    if (!rateLimits.has(key)) {
        rateLimits.set(key, { count: 1, resetAt: now + timeWindow });
        return { limited: false, remaining: maxUses - 1 };
    }

    const limit = rateLimits.get(key);

    // Reset if time window has passed
    if (now > limit.resetAt) {
        rateLimits.set(key, { count: 1, resetAt: now + timeWindow });
        return { limited: false, remaining: maxUses - 1 };
    }

    // Check if limit exceeded
    if (limit.count >= maxUses) {
        return {
            limited: true,
            resetIn: Math.ceil((limit.resetAt - now) / 1000),
            remaining: 0
        };
    }

    // Increment counter
    limit.count++;
    return { limited: false, remaining: maxUses - limit.count };
};

/**
 * Reset rate limit for a user/command combination
 * @param {string} userId - The user's Discord ID
 * @param {string} commandName - The command name
 */
const resetRateLimit = (userId, commandName) => {
    const key = `${userId}-${commandName}`;
    rateLimits.delete(key);
};

/**
 * Clear all rate limits for a user
 * @param {string} userId - The user's Discord ID
 */
const clearUserRateLimits = (userId) => {
    for (const key of rateLimits.keys()) {
        if (key.startsWith(userId)) {
            rateLimits.delete(key);
        }
    }
};

/**
 * Cleanup expired rate limits (call periodically)
 * Should be called every minute or so to prevent memory leaks
 */
const cleanupExpiredLimits = () => {
    const now = Date.now();
    for (const [key, value] of rateLimits) {
        if (now > value.resetAt) {
            rateLimits.delete(key);
        }
    }
};

// Automatically clean up every minute
setInterval(cleanupExpiredLimits, 60000);

/**
 * Get current rate limit status for debugging
 * @returns {Object} Rate limit statistics
 */
const getRateLimitStats = () => {
    return {
        activeKeys: rateLimits.size,
        entries: Array.from(rateLimits.entries()).map(([key, value]) => ({
            key,
            count: value.count,
            resetAt: new Date(value.resetAt).toISOString()
        }))
    };
};

module.exports = {
    checkRateLimit,
    resetRateLimit,
    clearUserRateLimits,
    cleanupExpiredLimits,
    getRateLimitStats
};
