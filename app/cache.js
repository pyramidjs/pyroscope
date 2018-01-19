/*eslint require-await: off, no-unused-vars: off*/

class Cache {

    /**
     * Create an instance of Cache
     *
     * @param {any} [options]
     */
    constructor(options) {
        this.options = options;
    }

    /**
     * List cached keys
     *
     * @returns {Promise<string[]>}
     */
    async keys() {}

    /**
     * Retrieve with an optional fallback
     *
     * @param {string} key
     * @param {any} [fallback]
     * @param {{mode?: string, duration?: number, flag?: string}} [options]
     * @returns {Promise<any>}
     */
    async get(key, fallback, options) {}

    /**
     * Set cache
     *
     * @param {string} key
     * @param {any} value
     * @param {{mode?: string, duration?: number, flag?: string}} [options]
     * @returns {Promise<void>}
     */
    async set(key, value, options) {}

    /**
     * Delete cache
     *
     * @param {string} key
     * @returns {Promise<void>}
     */
    async del(key) {}

    /**
     * Flush cache
     *
     * @returns {Promise<void>}
     */
    async flush() {}

    /**
     * Close connection
     *
     * @returns {Promise<void>}
     */
    async close() {}

}

class MemoryCache extends Cache {

    /**
     * Create an instance of Memory Cache
     *
     * @param {any} [options]
     */
    constructor(options) {
        super(options);
        this.__ = {};
    }

    /**
     * List cached keys
     *
     * @override
     */
    async keys() {
        return Object.keys(this.__);
    }

    /**
     * Retrieve with an optional fallback
     *
     * @param {string} key
     * @param {any} [fallback]
     * @param {{mode?: string, duration?: number, flag?: string}} [options]
     * @override
     */
    async get(key, fallback, options) {
        if (!this.__.hasOwnProperty(key)) {
            if (fallback != null) {
                if (typeof fallback === 'function') {
                    this.__[key] = await fallback();
                } else {
                    this.__[key] = JSON.parse(JSON.stringify(fallback));
                }
            }
        }

        return this.__[key];
    }

    /**
     * Set cache
     *
     * @param {string} key
     * @param {any} value
     * @param {{mode?: string, duration?: number, flag?: string}} [options]
     * @override
     */
    async set(key, value, options) {
        this.__[key] = JSON.parse(JSON.stringify(value));
    }

    /**
     * Delete cache
     *
     * @param {string} key
     * @override
     */
    async del(key) {
        delete this.__[key];
    }

    /**
     * Flush cache
     *
     * @override
     */
    async flush() {
        for (const key in this.__) {
            delete this.__[key];
        }
    }

    /**
     * Close connection
     *
     * @override
     */
    async close() {
        delete this.__;
    }

}

class RedisCache extends Cache {

    /**
     * Create an instance of Redis Cache
     * @param {host?: string, port?: number, prefix?: string} options
     */
    constructor(options) {
        super(options);
        this.pattern = this.options.prefix ? this.options.prefix + '*' : '*';
        this.redis = require('redis').createClient(options);
    }

    /**
     * List cached keys
     *
     * @override
     */
    async keys() {
        return new Promise((resolve, reject) => {
            this.redis.keys(this.pattern, (err, keys) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(keys);
                }
            });
        });
    }

    /**
     * Retrieve with an optional fallback
     *
     * @param {string} key
     * @param {any} [fallback]
     * @param {{mode?: string, duration?: number, flag?: string}} [options]
     * @override
     */
    async get(key, fallback, options) {
        const Promise = require('bluebird');

        return new Promise((resolve, reject) => {
            this.redis.get(key, async (err, rep) => {
                if (err) {
                    reject(err);
                } else if (rep != null) {
                    if (typeof rep === 'string') {
                        rep = JSON.parse(rep);
                    }
                    resolve(rep);
                } else if (fallback != null) {
                    if (typeof fallback === 'function') {
                        rep = await fallback();
                    } else {
                        rep = fallback;
                    }
                    if (rep !== null && typeof rep !== 'number') {
                        rep = JSON.stringify(rep);
                    }
                    const params = [];
                    if (options) {
                        params.push(options.mode || 'EX');
                        if (options.duration) {
                            params.push(options.duration);
                        }
                        if (options.flag) {
                            params.push(options.flag);
                        }
                    }
                    this.redis.set(key, rep, ...params, err => {
                        if (err) {
                            reject(err);
                        } else {
                            if (typeof rep === 'string') {
                                rep = JSON.parse(rep);
                            }
                            resolve(rep);
                        }
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Set cache
     *
     * @param {string} key
     * @param {any} value
     * @param {{mode?: string, duration?: number, flag?: string}} [options]
     * @override
     */
    async set(key, value, options) {
        const params = [];
        if (options) {
            params.push(options.mode || 'EX');
            if (options.duration) {
                params.push(options.duration);
            }
            if (options.flag) {
                params.push(options.flag);
            }
        }

        return new Promise((resolve, reject) => {
            if (value !== null && typeof rep !== 'number') {
                value = JSON.stringify(value);
            }
            this.redis.set(key, value, ...params, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Delete cache
     *
     * @param {string} key
     * @override
     */
    async del(key) {
        return new Promise((resolve, reject) => {
            this.redis.del(key, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Flush cache
     *
     * @override
     */
    async flush() {
        return new Promise((resolve, reject) => {
            this.redis.eval(
                'local keys = redis.call("keys", ARGV[1]); return #keys > 0 and redis.call("del", unpack(keys)) or 0',
                0,
                this.pattern,
                err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * Close connection
     *
     * @override
     */
    async close() {
        return new Promise((resolve, reject) => {
            this.redis.quit(err => {
                resolve();
            });
        });
    }

}

/**
 * Create cache instance
 *
 * @param {{driver: 'memory'}|{driver: 'redis', host?: string, port?: number, prefix?: string}} options
 * @returns {Cache}
 */
function cache(options) {
    if (options && options.driver == 'redis') {
        return new RedisCache(options);
    }

    return new MemoryCache(options);
}

cache.RedisCache = RedisCache;
cache.MemoryCache = MemoryCache;

module.exports = cache;
