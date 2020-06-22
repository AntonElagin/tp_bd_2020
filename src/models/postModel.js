const {db, pgp} = require('../modules/db-config');
const Users = require('./userModel');


module.exports = new class PostModel {
  constructor() {
    this.db = db;
  }

  getPostDetailsTx(id, related) {
    return this.db.tx(async (t) => {
      const post = await this.getPostById(id, t);

      if (!post) {
        return {
          status: 404,
          data: {
            message: `Can't find post with id '${id}'\n`,
          },
        };
      }

      post.id = +post.id;
      post.thread = +post.thread;
      post.parent = +post.parent;
      post.isEdited = post.isedited;
      delete(post.isedited);
      const res = {
        post,
      };

      for (const value of related) {
        switch (value) {
          case 'user':
            const author = await Users.getUserByNickname(
                post.author,
                t,
            );


            res.author = author;
            break;
          case 'forum':
            const forum = await this.getForumDetails(post.forum, t);

            forum.posts = +forum.posts;
            forum.user = forum.author;
            delete(forum.author);
            forum.threads = +forum.threads;
            res.forum = forum;
            break;
          case 'thread':
            const thread =
              await this.getThreadById(post.thread, t);

            thread.id = +thread.id;
            thread.votes = +thread.votes;

            res.thread = thread;
            break;
        }
      }

      return {
        status: 200,
        data: res,
      };
    });
  }

  async getForumDetails(forumSlug = '', db = this.db) {
    return await db.oneOrNone(`Select * 
      from forums
      where slug = $1`, [
      forumSlug,
    ]);
  }

  async getThreadById(id = -1, db = this.db) {
    return await this.db.oneOrNone(`
    Select * from threads
    where id = $1;
    `,
    [
      id,
    ]);
  }

  createPost(post, db = this.db) {
    return db.one(`
      INSERT INTO posts (author, forum, thread,
        created, message, parent)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [
      post.author,
      post.forum,
      post.thread,
      post.created,
      post.message,
      (post.parent) ? post.parent: null,
    ]);
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

  async getPostById(id, db = this.db) {
    return await db.oneOrNone(`
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
    db = this.db,
  } = {}) {
    return await db.manyOrNone(`
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
    db = this.db,
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
    return await db.manyOrNone(`
        SELECT * FROM posts
        WHERE thread = $1 $2:raw
        ORDER BY path $3:raw 
        LIMIT $4`, [
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
    db = this.db,
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
    return await db.manyOrNone(`
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

