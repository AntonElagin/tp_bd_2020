const {db, pgp} = require('../modules/db-config');


module.exports = new class PostModel {
  constructor() {
    this.db = db;
  }


  async createPosts(postsArr) {
    return await this.db.task(
        async (t) => {
          const posts = [];
          for (const post of postsArr) {
            posts.push(
                await t.one(`
            INSERT INTO posts (author, forum, thread, created, message, parent)
            values($1, $2, $3, $4, $5, $6) returning *;
          `, [
                  post.author,
                  post.forum,
                  post.thread,
                  post.created,
                  post.message,
            (post.parent) ? post.parent: null,
                ]),

            );
          }
          return t.batch(posts);
        },
    );
  }

  async getPostById(id) {
    return await this.db.oneOrNone(`
        SELECT * from posts
        where id = $1
      `, [id]);
  }


  async getPostByIdAndThread(id, thread) {
    return await this.db.oneOrNone(`
        SELECT * from posts
        where id = $1 and thread = $2
      `, [id, thread.id]);
  }

  async getPostByIdListAndThread(idList, thread) {
    return await this.db.manyOrNone(`
        SELECT * from posts
        where id in ($1:csv) and thread = $2
      `, [idList, thread.id]);
  }

  async updatePostMessage(id = -1, message = '') {
    return await this.db.oneOrNone(`
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
  }

  async getPostsbytThreadWithFlatSort(threadId, {
    limit = 1000,
    desc = false,
    since = null,
  } = {}) {
    return await this.db.manyOrNone(`
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
  }

  async getPostsbytThreadWithTreeSort(threadId, {
    limit = 1000,
    desc = false,
    since = null,
  } = {}) {
    let whereCondition;
    if (since ) {
      if (desc) {
        whereCondition = pgp.as.format(` 
        AND path <
        (SELECT path FROM posts WHERE id = $1) `, [
          since,
        ]);
      } else {
        whereCondition = pgp.as.format(`
        AND path >
         (SELECT path FROM posts WHERE id = $1) `,
        [
          since,
        ]);
      }
    }
    return await this.db.manyOrNone(`
        SELECT * FROM posts
        WHERE thread = $1 $2:raw
        ORDER BY path $3:raw LIMIT $4`, [
      threadId,
        (since ) ? whereCondition.toString() : '',
        (desc ? ' DESC' : 'ASC'),
        limit,
    ]);
  }

  async getPostsbytThreadWithTreeWithParentSort(threadId, {
    limit = 1000,
    desc = false,
    since = null,
  } = {}) {
    let subWhereCondition;
    if (since && desc) {
      subWhereCondition = pgp.as.format(`
        WHERE parent IS NULL 
        AND thread = $1  
        AND path[1] <
        (SELECT path[1] FROM posts WHERE id =  $2) `,
      [threadId, since]);
    } else if (since && !desc) {
      subWhereCondition = pgp.as.format(` 
        WHERE parent IS NULL 
        AND thread = $1  
        AND path[1] >
         (SELECT path[1] FROM posts WHERE id =  $2) `,
      [threadId, since]);
    } else {
      subWhereCondition = pgp.as.format(`
         WHERE parent IS NULL 
        AND thread = $1  `, [threadId]);
    }
    return await this.db.manyOrNone(`
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
  }
};

