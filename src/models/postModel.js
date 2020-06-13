const db = require('../modules/db-config');


module.exports = new class PostModel {
  constructor() {
    this._db = db;
  }

  async createPost(user, thread, post) {
    try {
      const data = await this._db.db.one(`
        Insert into posts (author,
          forum, thread,
          created, isEdited,
           message, parent)
        values ($1, $2, $3, $4, $5, $6, $7)
        returning *
      `, [
        user.nickname,
        thread.forum,
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
      console.error(`
      [Posts] Create Post error:
      ${err.message}
      `);
      return {
        success: false,
        err,
      };
    }
  }

  async createPosts(postsArr) {
    try {
      const cs = new this._db.pgp.helpers.ColumnSet([
        'author',
        'forum',
        'thread',
        'created',
        'message',
        {
          name: 'parent',
          skip: function() {
            const val = this['parent'];
            return !val;
          },
        },
      ], {table: 'posts'});

      const insertQuery = this._db.pgp.helpers.insert(postsArr, cs) +
           'returning *';

      const data = await this._db.db.manyOrNone(insertQuery);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Posts] Create Posts error:
      ${err.message}
      `);
      return {
        success: false,
        err,
      };
    }
  }

  async getPostById(id) {
    try {
      const data = await this._db.db.oneOrNone(`
        SELECT * from posts
        where id = $1
      `, [id]);

      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Posts] Get Post by id error:
      ${err.message}
      `);
      return {
        success: false,
        err,
      };
    }
  }


  async getPostByIdAndThread(id, thread) {
    try {
      const data = await this._db.db.oneOrNone(`
        SELECT * from posts
        where id = $1 and thread = $2
      `, [id, thread.id]);

      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Posts] Create Post by id and thread error:
      ${err.message}
      `);
      return {
        success: false,
        err,
      };
    }
  }

  async getPostByIdListAndThread(idList, thread) {
    try {
      console.log(idList);
      const data = await this._db.db.manyOrNone(`
        SELECT * from posts
        where id in ($1:csv) and thread = $2
      `, [idList, thread.id]);

      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Posts] Create Post by id list and thread error:
      ${err.message}
      `);
      return {
        success: false,
        err,
      };
    }
  }

  async updatePostMessage(id = -1, message = '') {
    try {
      const data = await this._db.db.oneOrNone(`
        Update posts 
        set message = $1 , isedited = true 
        where id = $2 and message <> $1
        returning author,
        created, forum,
        id, isedited as "isEdited",
        message, thread
      `, [
        message,
        id,
      ]);

      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Posts] Update Post message error:
      ${err.message}
      `);
      return {
        success: false,
        err,
      };
    }
  }

  async getPostsbytThreadWithFlatSort(threadId, {
    limit = 1000,
    desc = false,
    since = null,
  } = {}) {
    try {
      const data = await this._db.db.manyOrNone(`
      SELECT * FROM posts
       WHERE thread = $1 
       $2:raw
      ORDER BY created $3:raw, id $3:raw 
      LIMIT $4`, [
        threadId,
      (since)? ('And id ' + ((desc)? '< ' + since: '> ' + since)): '',
      (desc)? 'DESC': 'ASC',
      limit,
      ]);

      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Posts] Gets Posts FLAT error:
      ${err.message}
      `);
      return {
        success: false,
        err,
      };
    }
  }

  async getPostsbytThreadWithTreeSort(threadId, {
    limit = 1000,
    desc = false,
    since = null,
  } = {}) {
    try {
      let whereCondition;
      if (since ) {
        if (desc) {
          whereCondition = this._db.pgp.as.format(` 
        AND path <
        (SELECT path FROM posts WHERE id = $1) `, [
            since,
          ]);
        } else {
          whereCondition = this._db.pgp.as.format(`
        AND path >
         (SELECT path FROM posts WHERE id = $1) `,
          [
            since,
          ]);
        }
      }
      const data = await this._db.db.manyOrNone(`
        SELECT * FROM posts
        WHERE thread = $1 $2:raw
        ORDER BY path $3:raw LIMIT $4`, [
        threadId,
        (since ) ? whereCondition.toString() : '',
        (desc ? ' DESC' : 'ASC'),
        limit,
      ]);

      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Posts] Get Posts TREE error:
      ${err.message}
      `);

      return {
        success: false,
        err,
      };
    }
  }

  async getPostsbytThreadWithTreeWithParentSort(threadId, {
    limit = 1000,
    desc = false,
    since = null,
  } = {}) {
    try {
      let subWhereCondition;
      if (since && desc) {
        subWhereCondition = this._db.pgp.as.format(`
        WHERE parent IS NULL 
        AND thread = $1  
        AND path[1] <
        (SELECT path[1] FROM posts WHERE id =  $2) `,
        [threadId, since]);
      } else if (since && !desc) {
        subWhereCondition = this._db.pgp.as.format(` 
        WHERE parent IS NULL 
        AND thread = $1  
        AND path[1] >
         (SELECT path[1] FROM posts WHERE id =  $2) `,
        [threadId, since]);
      } else {
        subWhereCondition = this._db.pgp.as.format(`
         WHERE parent IS NULL 
        AND thread = $1  `, [threadId]);
      }
      const data = await this._db.db.manyOrNone(`
          SELECT * FROM posts JOIN
          (SELECT id AS sub_parent_id 
            FROM posts $1:raw ORDER BY id $5:raw LIMIT $4 ) AS sub 
          ON (thread = $2 AND sub.sub_parent_id = path[1]) 
          ORDER BY $3:raw`, [
        subWhereCondition.toString(),
        threadId,
        desc? 'sub.sub_parent_id DESC, path ASC' :
        'path ASC',
        limit,
        desc? 'DESC ' : 'ASC',
      ]);

      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error(`
      [Posts] Get Posts TREE_PARENT error:
      ${err.message}
      `);
      return {
        success: false,
        err,
      };
    }
  }
};

