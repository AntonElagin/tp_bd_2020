const db = require('../modules/db-config');
// const PQ = require('pg-promise').ParameterizedQuery;

module.exports = new class PostModel {
  constructor() {
    this._db = db;
  }

  async createOrUpdateVote(thread, user, voice) {
    try {
      const data = await this._db.db.one(`INSERT INTO votes
      (nickname, thread, voice)
      VALUES ($1, $2, $3) 
      ON CONFLICT ON CONSTRAINT unique_vote DO
      UPDATE votes SET voice = $3 WHERE voice <> $3
      RETURNING *`, [
        user.nickname,
        thread.slug,
        voice,
      ]);

      return {
        success: true,
        data,
      };
    } catch (err) {
      return {
        success: false,
        err,
      };
    }
  }
};
