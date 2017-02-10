# rdb-dataloader

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

This module targets at [relational database](https://en.wikipedia.org/wiki/Relational_database) such as MySQL, SQL Server. Heavily inspired by Facebook [DataLoader](https://github.com/facebook/dataloader/issues).

[npm-image]: https://img.shields.io/npm/v/rdb-dataloader.svg?style=flat-square
[npm-url]: https://npmjs.org/package/rdb-dataloader
[travis-image]: https://img.shields.io/travis/luckydrq/rdb-dataloader/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/luckydrq/rdb-dataloader
[codecov-image]: https://codecov.io/gh/luckydrq/rdb-dataloader/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/luckydrq/rdb-dataloader
[david-image]: https://img.shields.io/david/luckydrq/rdb-dataloader.svg?style=flat-square
[david-url]: https://david-dm.org/luckydrq/rdb-dataloader
[snyk-image]: https://snyk.io/test/npm/rdb-dataloader/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/rdb-dataloader
[download-image]: https://img.shields.io/npm/dm/rdb-dataloader.svg?style=flat-square
[download-url]: https://npmjs.org/package/rdb-dataloader

## Install
`$ npm i rdb-dataloader`

## Why?
First i'd like to say [DataLoader](https://github.com/facebook/dataloader/issues) is a great module that, like it's said, aims to provide per-request cache to save network IO and extremly useful for data service implemented by [GraphQL](http://graphql.org) which intergreted with my project recently. I use MySQL as data storage layer which is a common case in real world i believe. However, I found something inconvenient when playing with MySQL:

### Unnecessary duplicate cache
It is common to have one or more unique key(s) in a table. For example,
an User table with these fields: `id`, `name`, `mobile` can have
`id` as the [Primary Key](http://wiki.c2.com/?PrimaryKey) and `mobile`
as a [Unique Key](https://en.wikipedia.org/wiki/Unique_key). So the data service has to response to `fetchByIds` and `fetchByMobiles` calls. Then it
have to initiate two instances when using [DataLoader](https://github.com/facebook/dataloader):
```js
  const DataLoader = require('dataloader');
  const idLoader = new DataLoader(fetchByIds);
  const mobileLoader = new DataLoader(fetchByMobiles);

  idLoader.load(1);
  mobileLoader.load('+86123456');

  function fetchByIds(ids) {
    return db.Users.getByIds(ids);
  }

  function fetchByMobiles(mobiles) {
    return db.Users.getByMobiles(mobiles);
  }
```

This can work but it's not good enough and the logic is far more complex
in real world. Two instances meaning two separate [cache](https://github.com/facebook/dataloader/blob/master/src/index.js#L56), you can imagine
that there would be many duplecate records cached in both instance
cache just because they are fetched by a different key(`id` or
`mobile`) and *Network Still happens for both sides*. Also there would be more instances to initiate as the number
of unique keys increases.

### Duplicate keys
There is an old [issue](https://github.com/facebook/dataloader/issues/49) and [DataLoader](https://github.com/facebook/dataloader) fixes now.

## What does this module address?
This module aims to solve the inconvenience metioned above when playing with relational database. *It is recommended that one loader per table.* It'd use a single cache and whenever a record is fetched by PK or UK, it'd `contribute` to the cache. Accordingly, it'd support load by PK or UK to take full advantage of cache.

## Example
```js
  const uniqueKeyMap = new Map();
  uniqueKeyMap.set('name', db.fetchByNames); // UK
  uniqueKeyMap.set('email', db.fetchByEmails);  // UK
  const loader = new DataLoader(db.fetchByIds, { uniqueKeyMap });
  loader.load('luckydrq', 'name') // the second argument `name` is to tell loader to fetchByNames
    .then(record => {
      assert(record.id === 1);
      assert(loader._promiseCache.size === 1);
      done();
    }).catch(done);
```

More [examples](https://github.com/luckydrq/rdb-dataloader/blob/master/test/index.test.js).

## API
Since this module inherits from [DataLoader](https://github.com/facebook/dataloader), it is compatible with the apis of DataLoader. But as you can see from former example, the api is extended. Extended apis are the following:

### contructor(options)
The constructor accepts all the options that DataLoader accepts. `options.cache = true` and `options.batch = true` is set by default and there is no way to override it because it'd be useless without these two features disabled. Alse, there are additional options as below:

- options.primaryKey(optional): String
Specify PK name, default is "id";

- options.uniqueKeyMap(optional): ES6 Map
  - key: String
    UK name
  - value: Function
    Batch function for UK
Use it when you want to fetch by UK.

### load(key[, uniqueKey])
If you want to load by UK, the second argument should be specified, omitted meaning load by PK.

### loadMany(keys[, uniqueKey])
If you want to load by UK, the second argument should be specified, omitted meaning load by PK.

## Lisence
MIT
