const DatabaseModule = require('./db-pgsql');

// Database connection details;
const connOptions = {
  host: 'localhost', // localhost is the default
  port: 5432, // 5432 is the default;
  database: 'docker',
  user: 'docker',
  password: 'docker',
};

const dbConfig = new DatabaseModule(connOptions);

module.exports = dbConfig;
