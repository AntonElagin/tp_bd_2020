const db = require('../modules/db-config');
// const PQ = require('pg-promise').ParameterizedQuery;

module.exports = new class PostModel {
  constructor() {
    this._db = db;
  }

  async createPost(user, thread, post) {
    try {
      const data = this._db.db.one(`
        Insert into posts (author_id, author_nickname,
          forum_id, forum_slug,
          thread_id, thread_slug,
          created, iseditied, message, parent)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        returning author_nickname as author, created,
         forum_slug as forum, id, isedited as 'isEdited',
          message, parent, thread_id as thread
      `, [
        user.id,
        user.nickname,
        thread.forum_id,
        thread.forum_slug,
        thread.id,
        thread.slug,
        post.created,
        post.isEdited,
        post.message,
        post.parent,
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

  async getPostById(id) {
    try {
      const data = await this._db.db.one(`
        SELECT * from posts
        where id = $1
      `[id]);

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

  async updatePostMessage(id = -1, message = '') {
    try {
      const data = await this._db.db.one(`
        Update posts 
        set message = $1 , isEdited = true 
        where id = $2
        returning author_nickname as author,
        created, forum_slug as forum,
        id, isEdited as 'isEdited',
        message, parent, thread_id as thread
      `, [
        message,
        id,
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

module.exports = PostModel;
