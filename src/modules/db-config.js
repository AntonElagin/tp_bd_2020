const Promise = require('bluebird');
// Promise.config({
//   // Enable warnings
//   warnings: false,
//   // Enable long stack traces
//   longStackTraces: false,
//   // Enable cancellation
//   cancellation: false,
//   // Enable monitoring
//   monitoring: false,
//   // Enable async hooks
//   asyncHooks: true,
// });
const pgp = require('pg-promise')({
  promiseLib: Promise,
});

// Database connection details;
const connOptions = {
  host: 'localhost', // localhost is the default
  port: 5432, // 5432 is the default;
  database: 'docker',
  user: 'docker',
  password: 'docker',
  max: 30,
};


module.exports = {
  db: pgp(connOptions),
  pgp,
};
