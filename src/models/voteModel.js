const db = require('../modules/db-config');
// const PQ = require('pg-promise').ParameterizedQuery;

module.exports = new class PostModel {
  constructor() {
    this._db = db;
  }

  async createOrUpdateVote(thread, user, voice) {
    try {
      const data = await this._db.db.multi(`
      INSERT INTO votes as v
      (nickname, thread, voice)
      VALUES ($1, $2, $3) 
      ON CONFLICT ON CONSTRAINT unique_vote DO
      UPDATE SET voice = $3;

      select * from threads where id = $4;
      `, [
        user.nickname,
        thread.id,
        voice,
        thread.id,
      ]);

      return {
        success: true,
        data: data[1][0],
      };
    } catch (err) {
      console.error(`
      [Posts] vote error:
      ${err.message}
      `);
      return {
        success: false,
        err,
      };
    }
  }
};
