'use strict';

const assert = require('assert');
const is = require('is-type-of');
const DataLoader = require('dataloader');

class RDBDataLoader extends DataLoader {
  /**
   * @constructor
   * @param {Function} batchLoadFn - batch load function
   * @param {Object} options - options
   * @param {String} options.primaryKey - primary key of rational database table
   * @param {Array} options.uniqueKeys - unique key list of rational database table
   * @since 1.0.0
   */
  constructor(batchLoadFn, options) {
    options = options || {};

    if (options.primaryKey) {
      assert(is.string(options.primaryKey) && options.primaryKey !== '', 'options.primaryKey should a non-empty string!');
    }

    if (options.uniqueKeyMap) {
      assert(options.uniqueKeyMap instanceof Map, 'options.uniqueKeyMap should be ES6 Map!');
    }

    // preset options, it does not need to be configable in user land.
    options.batch = true;
    options.cache = true;
    options.cacheMap = new Map();

    super(batchLoadFn, options);

    this._primaryKey = options.primaryKey || 'id'; // default is `id` which is right in most cases of real world
    this._uniqueKeyMap = options.uniqueKeyMap || new Map();
    this._uniqueLoaders = new Map();

    for (const entry of this._uniqueKeyMap.entries()) {
      const key = formatKey(entry[0]);
      const batchFn = entry[1];
      // we don't cache for unique loaders
      this._uniqueLoaders.set(key, new DataLoader(batchFn, {
        cache: false,
        cacheKeyFn: formatKey,
      }));
    }
  }

  load(key, uniqueKey) {
    uniqueKey = uniqueKey || this._primaryKey;

    if (uniqueKey !== this._primaryKey) {
      const formattedUniqueKey = formatKey(uniqueKey);
      // if it is not specified as primary key, it should be an unique key, or it will throw error
      if (!this._uniqueLoaders.has(formattedUniqueKey)) {
        throw new Error(`${formattedUniqueKey} is not defined as unique key`);
      }

      return this._makePromise(key, uniqueKey);
    }

    return super.load(key);
  }

  /**
   * load keys for data, same effort as DataLoader
   * @param {Array} keys - keys
   * @param {String|Array} uniqueKey - In RDB, unique key can be one column or multiple columns
   * @return {Promise} result - resolved array
   */
  loadMany(keys, uniqueKey) {
    // keys should be an array or it will throw error
    if (Array.isArray(keys)) {
      // Keys in rdb should be deduplicated before dispatching a query, because the result always be the same for duplicated keys.
      // @see https://github.com/facebook/dataloader/issues/49
      // [1, 1, 2] => [1, 2] => SELECT * from table WHERE id IN (1, 2)
      keys = this._deduplicateKeys(keys);

      uniqueKey = uniqueKey || this._primaryKey;
      if (uniqueKey !== this._primaryKey) {
        const formattedUniqueKey = formatKey(uniqueKey);
        // if it is not specified as primary key, it should be an unique key, or it will throw error
        if (!this._uniqueLoaders.has(formattedUniqueKey)) {
          throw new Error(`${formattedUniqueKey} is not defined as unique key`);
        }

        const promises = [];

        // Look up in cache and see if there is already one.
        // The cache is using primary key, but we got unique key.
        // Luckily, in rdb it can tell that an unique key is associated with a primary key
        for (const key of keys) {
          promises.push(this._makePromise(key, uniqueKey));
        }

        return Promise.all(promises);
      }
    }

    return super.loadMany(keys);
  }

  _makePromise(key, uniqueKey) {
    return new Promise(resolve => {
      this._lookupCache(key, uniqueKey)
        .then(record => {
          if (record) {
            // Found in cache
            resolve(record);
            return;
          }

          // Dispatch a query
          const loader = this._uniqueLoaders.get(formatKey(uniqueKey));
          loader.load(key)
            .then(record => {
              // Add in cache if record contains primary key
              if (record && record.hasOwnProperty(this._primaryKey)) {
                // If the record has primary key, then add it to cache
                const key = record[this._primaryKey];
                const cacheKey = this._options.cacheKeyFn ? this._options.cacheKeyFn(key) : key;
                this._promiseCache.set(cacheKey, Promise.resolve(record));
              }

              resolve(record);
            });
        });
    });
  }

  _lookupCache(key, uniqueKey) {
    const promiseCache = this._promiseCache;

    return new Promise(resolve => {
      Promise.all(promiseCache.values())
        .then(records => {
          for (const record of records) {
            let cachedKey;
            // uniqueKey may be a string or an array
            if (is.string(uniqueKey)) {
              cachedKey = record[uniqueKey];
            } else if (is.array(uniqueKey)) {
              // then key should be an array
              cachedKey = [];
              for (const column of uniqueKey) {
                cachedKey.push(record[column]);
              }
            }
            if (equal(key, cachedKey)) {
              // found
              return resolve(record);
            }
          }
          resolve(null);
        });
    });
  }

  _deduplicateKeys(keys) {
    const formattedKeys = [];

    return keys.reduce((arr, key) => {
      // key is an array when unique key contains multiple colums, so we should stringify it
      const formattedKey = formatKey(key);
      if (formattedKeys.indexOf(formattedKey) === -1) {
        formattedKeys.push(formattedKey);
        arr.push(key);
      }
      return arr;
    }, []);
  }
}

function formatKey(key) {
  if (is.object(key)) {
    key = JSON.stringify(key);
  }
  return key;
}

function equal(key, result) {
  if (is.array(key) && is.array(result)) {
    if (key.length === result.length) {
      for (let i = 0; i < key.length; i++) {
        if (key[i] !== result[i]) {
          return false;
        }
      }
      return true;
    }
    return false;
  }
  return key === result;

}

module.exports = RDBDataLoader;
