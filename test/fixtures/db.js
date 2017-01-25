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
  padding(result, ids.length - result.length);
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
  padding(result, names.length - result.length);
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
  padding(result, emails.length - result.length);
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
  padding(result, params.length - result.length);
  return Promise.resolve(result);
};

function padding(result, length) {
  for (let i = 0; i < length; i++) {
    result.push(null);
  }
}
