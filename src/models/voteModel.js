const db = require('../modules/db-config');
const PQ = require('pg-promise').ParameterizedQuery;

module.exports = new class PostModel {
  constructor() {
    this._db = db;
  }
};
