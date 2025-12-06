/**
 * Retry helper for handling transient database connection errors
 * Implements exponential backoff for Prisma queries
 */

const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1 second

/**
 * Check if error is a transient connection error that should be retried
 */
function isRetriableError(error) {
    const errorMessage = error?.message || '';
    const errorCode = error?.code || '';

    // Common transient errors
    const retriablePatterns = [
        'Connection closed',
        'Connection terminated',
        'Connection lost',
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'Connection ended unexpectedly',
        'P1001', // Can't reach database server
        'P1008', // Operations timed out
        'P1017', // Server has closed the connection
    ];

    return retriablePatterns.some(pattern =>
        errorMessage.includes(pattern) || errorCode.includes(pattern)
    );
}

/**
 * Execute a Prisma operation with retry logic
 * @param {Function} operation - The Prisma operation to execute
 * @param {number} retries - Number of retries remaining
 * @param {number} delay - Current delay in milliseconds
 * @returns {Promise<any>} - Result of the operation
 */
async function withRetry(operation, retries = MAX_RETRIES, delay = INITIAL_DELAY) {
    try {
        return await operation();
    } catch (error) {
        if (retries > 0 && isRetriableError(error)) {
            console.warn(`Database operation failed, retrying in ${delay}ms... (${retries} retries left)`);
            console.warn(`Error:`, error.message);

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));

            // Retry with exponential backoff
            return withRetry(operation, retries - 1, delay * 2);
        }

        // Not retriable or out of retries
        throw error;
    }
}

/**
 * Wrap a Prisma query with retry logic
 * Usage: await retryQuery(() => prisma.user.findMany())
 */
async function retryQuery(queryFn) {
    return withRetry(queryFn);
}

module.exports = {
    retryQuery,
    isRetriableError,
    withRetry,
};
