const pgp = require('pg-promise')();

// Database connection details;
const connOptions = {
  host: 'localhost', // localhost is the default
  port: 5432, // 5432 is the default;
  database: 'docker',
  user: 'docker',
  password: 'docker',
};


module.exports = {
  db: pgp(connOptions),
  pgp,
};
