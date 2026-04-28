const NodeCache = require('node-cache');

/**
 * In-memory cache utility using node-cache
 * - Default TTL: 300 seconds (5 minutes)
 * - Check period: 60 seconds (automatic cleanup)
 * - Used for caching frequently accessed data like caregivers, services
 */
const cache = new NodeCache({
    stdTTL: 300, // Default TTL: 5 minutes
    checkperiod: 60, // Check for expired keys every 60 seconds
    useClones: false, // Better performance, but be careful with object mutations
    deleteOnExpire: true,
});

// Cache statistics
let hits = 0;
let misses = 0;

// Log cache events
cache.on('set', (key, value) => {
    console.log(`[cache] SET: ${key}`);
});

cache.on('del', (key, value) => {
    console.log(`[cache] DEL: ${key}`);
});

cache.on('expired', (key, value) => {
    console.log(`[cache] EXPIRED: ${key}`);
});

cache.on('flush', () => {
    console.log(`[cache] FLUSH: All keys deleted`);
});

/**
 * Get or Set pattern - Fetch from cache or compute and store
 * @param {string} key - Cache key
 * @param {Function} fetchFunction - Async function to fetch data if not in cache
 * @param {number} ttl - Time to live in seconds (optional, defaults to cache stdTTL)
 * @returns {Promise<{data: any, fromCache: boolean}>}
 */
const getOrSet = async (key, fetchFunction, ttl = undefined) => {
    try {
        // Try to get from cache
        const cachedData = cache.get(key);
        
        if (cachedData !== undefined) {
            hits++;
            console.log(`[cache] HIT: ${key} (hits: ${hits}, misses: ${misses})`);
            return { data: cachedData, fromCache: true };
        }
        
        // Cache miss - fetch data
        misses++;
        console.log(`[cache] MISS: ${key} (hits: ${hits}, misses: ${misses})`);
        
        const data = await fetchFunction();
        
        // Store in cache if data is not null/undefined
        if (data !== null && data !== undefined) {
            const success = cache.set(key, data, ttl);
            if (success) {
                console.log(`[cache] STORED: ${key} (TTL: ${ttl || 'default'}s)`);
            }
        }
        
        return { data, fromCache: false };
    } catch (error) {
        console.error(`[cache] ERROR in getOrSet for key ${key}:`, error.message);
        // On error, try to fetch without caching
        const data = await fetchFunction();
        return { data, fromCache: false };
    }
};

/**
 * Invalidate cache keys matching a pattern
 * @param {string} pattern - Pattern to match (e.g., 'caregiver:*', 'booking:user:123:*')
 * @returns {number} - Number of keys deleted
 */
const invalidatePattern = (pattern) => {
    try {
        const keys = cache.keys();
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        
        let deletedCount = 0;
        keys.forEach(key => {
            if (regex.test(key)) {
                cache.del(key);
                deletedCount++;
            }
        });
        
        if (deletedCount > 0) {
            console.log(`[cache] INVALIDATED: ${deletedCount} keys matching pattern "${pattern}"`);
        }
        
        return deletedCount;
    } catch (error) {
        console.error(`[cache] ERROR in invalidatePattern:`, error.message);
        return 0;
    }
};

/**
 * Get cache statistics
 * @returns {object} - Cache stats
 */
const getStats = () => {
    const stats = cache.getStats();
    return {
        keys: stats.keys,
        hits: hits,
        misses: misses,
        hitRate: hits + misses > 0 ? (hits / (hits + misses) * 100).toFixed(2) + '%' : '0%',
        ksize: stats.ksize,
        vsize: stats.vsize
    };
};

/**
 * Clear all cache
 */
const flush = () => {
    cache.flushAll();
    hits = 0;
    misses = 0;
    console.log('[cache] All cache cleared and stats reset');
};

// Log cache stats every 5 minutes
setInterval(() => {
    const stats = getStats();
    console.log('[cache] Stats:', stats);
}, 5 * 60 * 1000);

module.exports = {
    cache,
    getOrSet,
    invalidatePattern,
    getStats,
    flush
};
