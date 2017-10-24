'use strict';

const data = require('./data.json');

exports.fetchByIds = ids => {
  const result = [];
  for (const id of ids) {
    for (const record of data) {
      if (record.id === id) {
        result.push(record);
      }
    }
  }
  return Promise.resolve(result);
};

exports.fetchByNames = names => {
  const result = [];
  for (const name of names) {
    for (const record of data) {
      if (record.name === name) {
        result.push(record);
      }
    }
  }
  return Promise.resolve(result);
};

exports.fetchByEmails = emails => {
  const result = [];
  for (const email of emails) {
    for (const record of data) {
      if (record.email === email) {
        result.push(record);
      }
    }
  }
  return Promise.resolve(result);
};

exports.fetchByNamesandEmails = params => {
  const result = [];
  for (const param of params) {
    const name = param[0];
    const email = param[1];
    for (const record of data) {
      if (record.name === name && record.email === email) {
        result.push(record);
      }
    }
  }
  return Promise.resolve(result);
};
