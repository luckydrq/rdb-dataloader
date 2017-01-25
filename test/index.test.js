'use strict';

const assert = require('assert');
const DataLoader = require('..');
const db = require('./fixtures/db');

describe('test/index.test.js', () => {
  describe('primary key', () => {
    it('should set primary key to `id` when not passed in', () => {
      const loader = new DataLoader(keys => keys);
      assert(loader._primaryKey === 'id');
    });

    it('should change primary key when explictly', () => {
      const loader = new DataLoader(keys => keys, { primaryKey: 'name' });
      assert(loader._primaryKey === 'name');
    });

    it('should load', done => {
      const loader = new DataLoader(db.fetchByIds);
      loader.load(1)
        .then(record => {
          assert(record.name === 'luckydrq');
          assert(record.email === 'luckydrq@gmail.com');
          done();
        }).catch(done);
    });

    it('should loadMany', done => {
      const loader = new DataLoader(db.fetchByIds);
      loader.loadMany([ 1, 2 ])
        .then(records => {
          assert(records.length === 2);
          assert(records[0].name === 'luckydrq');
          assert(records[1].name === 'dengruoqi');
          done();
        }).catch(done);
    });

    it('should deduplicate keys', done => {
      const loader = new DataLoader(db.fetchByIds);
      loader.loadMany([ 1, 1, 2 ])
        .then(records => {
          assert(records.length === 2);
          assert(records[0].name === 'luckydrq');
          assert(records[1].name === 'dengruoqi');
          done();
        }).catch(done);
    });

    it('should clear', done => {
      const loader = new DataLoader(db.fetchByIds);
      loader.loadMany([ 1, 2 ])
        .then(() => {
          assert(loader._promiseCache.size === 2);
          loader.clear(1);
          assert(loader._promiseCache.size === 1);
          done();
        }).catch(done);
    });

    it('should clearAll', done => {
      const loader = new DataLoader(db.fetchByIds);
      loader.loadMany([ 1, 2 ])
        .then(() => {
          assert(loader._promiseCache.size === 2);
          loader.clearAll();
          assert(loader._promiseCache.size === 0);
          done();
        }).catch(done);
    });

    it('should prime', done => {
      const loader = new DataLoader(db.fetchByIds);
      loader.prime(1, { name: 'luckydrq2' })
        .load(1)
        .then(record => {
          assert(record.name === 'luckydrq2');
          done();
        })
        .catch(done);
    });
  });

  describe('single unique key', () => {
    it('should throw when no unique key registered', done => {
      const loader = new DataLoader(db.fetchByIds);
      try {
        loader.load('luckydrq', 'name');
      } catch (e) {
        assert(e.message.indexOf('name is not defined as unique key') > -1);
      }
      try {
        loader.loadMany([ 'luckydrq' ], 'name');
      } catch (e) {
        assert(e.message.indexOf('name is not defined as unique key') > -1);
        done();
      }
    });

    it('should load by unique key', done => {
      const uniqueKeyMap = new Map();
      uniqueKeyMap.set('name', db.fetchByNames);
      uniqueKeyMap.set('email', db.fetchByEmails);
      const loader = new DataLoader(db.fetchByIds, { uniqueKeyMap });
      loader.load('luckydrq', 'name')
        .then(record => {
          assert(record.id === 1);
          assert(loader._promiseCache.size === 1);
          done();
        }).catch(done);
    });

    it('should use cache if found', done => {
      const uniqueKeyMap = new Map();

      let count = 0;
      const fetchByNames = names => {
        count++;
        return db.fetchByNames(names);
      };
      const fetchByEmails = emails => {
        count++;
        return db.fetchByEmails(emails);
      };
      uniqueKeyMap.set('name', fetchByNames);
      uniqueKeyMap.set('email', fetchByEmails);
      const loader = new DataLoader(db.fetchByIds, { uniqueKeyMap });
      loader.loadMany([ 1, 2 ])
        .then(() => {
          loader.load('luckydrq', 'name')
            .then(record => {
              assert(record.id === 1);
              assert(record.name === 'luckydrq');
              assert(count === 0);

              loader.load('dengruoqi@gmail.com', 'email')
                .then(record => {
                  assert(record.id === 2);
                  assert(record.name === 'dengruoqi');
                  assert(count === 0);

                  loader.load('xuezu', 'name')
                    .then(record => {
                      assert(record.id === 3);
                      assert(record.email === 'xuezu@gmail.com');
                      assert(loader._promiseCache.size === 3);
                      assert(count === 1);
                      done();
                    }).catch(done);
                }).catch(done);
            }).catch(done);
        }).catch(done);
    });

    it('should deduplicate keys', done => {
      const uniqueKeyMap = new Map();
      uniqueKeyMap.set('name', db.fetchByNames);
      uniqueKeyMap.set('email', db.fetchByEmails);
      const loader = new DataLoader(db.fetchByIds, { uniqueKeyMap });
      loader.loadMany([ 'luckydrq', 'luckydrq', 'xuezu' ], 'name')
        .then(records => {
          assert(records.length === 2);
          assert(records[0].id === 1);
          assert(records[1].id === 3);
          assert(loader._promiseCache.size === 2);
          done();
        }).catch(done);
    });

    it('should prime', done => {
      const uniqueKeyMap = new Map();
      uniqueKeyMap.set('name', db.fetchByNames);
      const loader = new DataLoader(db.fetchByIds, { uniqueKeyMap });

      loader.prime(1, { name: 'abc' })
        .load('abc', 'name')
        .then(record => {
          assert(record.name === 'abc');
          done();
        })
        .catch(done);
    });
  });

  describe('multiple unique key', () => {
    it('should load', done => {
      const uniqueKeyMap = new Map();
      uniqueKeyMap.set([ 'name', 'email' ], db.fetchByNamesandEmails);
      const loader = new DataLoader(db.fetchByIds, { uniqueKeyMap });
      loader.load([ 'luckydrq', 'luckydrq@gmail.com' ], [ 'name', 'email' ])
        .then(record => {
          assert(record.id === 1);
          assert(record.name === 'luckydrq');
          assert(record.email === 'luckydrq@gmail.com');
          done();
        }).catch(done);
    });

    it('should use cache if found', done => {
      const uniqueKeyMap = new Map();
      let count = 0;
      const fetchByNamesandEmails = params => {
        count++;
        return db.fetchByNamesandEmails(params);
      };
      uniqueKeyMap.set([ 'name', 'email' ], fetchByNamesandEmails);
      const loader = new DataLoader(db.fetchByIds, { uniqueKeyMap });
      loader.load(1)
        .then(() => {
          loader.load([ 'luckydrq', 'luckydrq@gmail.com' ], [ 'name', 'email' ])
            .then(record => {
              assert(count === 0);
              assert(record.name === 'luckydrq');
              assert(record.email === 'luckydrq@gmail.com');
              done();
            }).catch(done);
        }).catch(done);
    });

    it('should loadMany', done => {
      const uniqueKeyMap = new Map();
      uniqueKeyMap.set([ 'name', 'email' ], db.fetchByNamesandEmails);
      const loader = new DataLoader(db.fetchByIds, { uniqueKeyMap });

      loader.loadMany([[ 'luckydrq', 'luckydrq@gmail.com' ], [ 'xuezu', 'xuezu@gmail.com' ]], [ 'name', 'email' ])
        .then(records => {
          assert(records.length === 2);
          assert(records[0].name === 'luckydrq');
          assert(records[0].email === 'luckydrq@gmail.com');
          assert(records[1].name === 'xuezu');
          assert(records[1].email === 'xuezu@gmail.com');
          done();
        }).catch(done);
    });

    it('should query when not found in cache', done => {
      const uniqueKeyMap = new Map();
      let count = 0;
      const fetchByNamesandEmails = params => {
        count++;
        return db.fetchByNamesandEmails(params);
      };
      uniqueKeyMap.set([ 'name', 'email' ], fetchByNamesandEmails);
      const loader = new DataLoader(db.fetchByIds, { uniqueKeyMap });

      loader.load(1)
        .then(() => {
          loader.loadMany([[ 'luckydrq', 'luckydrq@gmail.com' ], [ 'xuezu', 'xuezu@gmail.com' ]], [ 'name', 'email' ])
            .then(records => {
              assert(count === 1);
              assert(records.length === 2);
              assert(records[0].name === 'luckydrq');
              assert(records[0].email === 'luckydrq@gmail.com');
              assert(records[1].name === 'xuezu');
              assert(records[1].email === 'xuezu@gmail.com');
              assert(loader._promiseCache.size === 2);
              done();
            }).catch(done);
        }).catch(done);
    });

    it('should deduplicate keys', done => {
      const uniqueKeyMap = new Map();
      uniqueKeyMap.set([ 'name', 'email' ], db.fetchByNamesandEmails);
      const loader = new DataLoader(db.fetchByIds, { uniqueKeyMap });
      loader.loadMany([[ 'luckydrq', 'luckydrq@gmail.com' ], [ 'luckydrq', 'luckydrq@gmail.com' ]], [ 'name', 'email' ])
        .then(records => {
          assert(records.length === 1);
          assert(records[0].id === 1);
          assert(records[0].name === 'luckydrq');
          assert(records[0].email === 'luckydrq@gmail.com');
          done();
        }).catch(done);
    });

    it('should return null when not found in database', done => {
      const uniqueKeyMap = new Map();
      uniqueKeyMap.set([ 'name', 'email' ], db.fetchByNamesandEmails);
      const loader = new DataLoader(db.fetchByIds, { uniqueKeyMap });
      loader.loadMany([[ 'luckydrq', 'luckydrq@gmail.com' ], [ 'unknow', 'unknow' ]], [ 'name', 'email' ])
        .then(records => {
          assert(records.length, 2);
          assert(records[0].name === 'luckydrq');
          assert(records[1] == null);
          done();
        }).catch(done);
    });
  });
});
