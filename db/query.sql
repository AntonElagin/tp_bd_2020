CREATE EXTENSION
IF NOT EXISTS CITEXT;

-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS forums CASCADE;
-- DROP TABLE IF EXISTS threads CASCADE;
-- DROP TABLE IF EXISTS posts CASCADE;
-- DROP TABLE IF EXISTS votes CASCADE;
-- DROP TABLE IF EXISTS forum_users CASCADE;

-- Users table and users indexes


CREATE UNLOGGED TABLE
IF NOT EXISTS users
(
    nickname    CITEXT PRIMARY KEY UNIQUE NOT NULL,
    fullname    VARCHAR NOT NULL,
    about       TEXT NOT NULL,
    email       CITEXT      UNIQUE NOT NULL
);



-- CREATE UNIQUE INDEX IF NOT EXISTS index_users_email
--     ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS index_users_nickname
    ON users (nickname);
CREATE INDEX IF NOT EXISTS index_users_all
    ON users (nickname, email, about, fullname);

-- Forums table and indexes


CREATE UNLOGGED TABLE
IF NOT EXISTS forums
(
    slug    CITEXT PRIMARY KEY UNIQUE NOT NULL,
    title   VARCHAR     NOT NULL,
    author    CITEXT      NOT NULL,
    posts   INTEGER     DEFAULT 0 NOT NULL,
    threads INTEGER     DEFAULT 0 NOT NULL,

    FOREIGN KEY (author) REFERENCES users (nickname)
);

CREATE INDEX IF NOT EXISTS index_forums_slug 
    ON forums (slug, title, author, posts, threads);


-- Threads table and indexes


CREATE UNLOGGED TABLE
IF NOT EXISTS threads
(
    id              BIGSERIAL  PRIMARY KEY UNIQUE NOT NULL,
    slug            CITEXT     UNIQUE,
    author          CITEXT     NOT NULL,
    forum           CITEXT     NOT NULL,
    created         TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    title           VARCHAR    NOT NULL,
    message         VARCHAR    NOT NULL,
    votes           INTEGER    DEFAULT 0 NOT NULL,


    FOREIGN KEY (author) REFERENCES users (nickname)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (forum) REFERENCES forums (slug)
);

CREATE INDEX
IF NOT EXISTS index_threads_slug ON threads
(slug);
CREATE INDEX
IF NOT EXISTS index_threads_id ON threads (id);
CREATE INDEX
IF NOT EXISTS index_threads_double ON threads
(forum,created);


-- Threads table and indexes


CREATE UNLOGGED TABLE
IF NOT EXISTS posts
(
    id        BIGSERIAL PRIMARY KEY UNIQUE NOT NULL,
    author    CITEXT    NOT NULL ,
    forum     CITEXT    NOT NULL ,
    thread    BIGINT    NOT NULL,
    created   TIMESTAMP WITH TIME ZONE    DEFAULT NOW(),
    isEdited  BOOLEAN   DEFAULT FALSE,
    message   VARCHAR   NOT NULL,
    parent    BIGINT    NULL,
    path   BIGINT[],

    FOREIGN KEY (author) REFERENCES users (nickname),
    FOREIGN KEY (parent) REFERENCES posts (id),
    FOREIGN KEY (forum) REFERENCES forums (slug),
    FOREIGN KEY (thread) REFERENCES threads (id)
);

CREATE INDEX IF NOT EXISTS idx_posts_path ON posts USING GIN (path);
CREATE INDEX IF NOT EXISTS idx_posts_forum ON posts (forum);
CREATE INDEX IF NOT EXISTS idx_posts_parent ON posts (parent);
CREATE INDEX IF NOT EXISTS idx_posts_thread_id ON posts (thread, id);
CREATE INDEX IF NOT EXISTS idx_posts_full
    ON posts (id, parent, thread, forum, author, created, message, isedited, path);
CREATE INDEX IF NOT EXISTS idx_posts_created
    ON posts (created);

-- Votes table and indexes


CREATE UNLOGGED TABLE
IF NOT EXISTS votes
(
    nickname        CITEXT      NOT NULL,
    thread          BIGINT      NOT NULL,
    voice           INTEGER     NOT NULL,
    FOREIGN KEY (thread) REFERENCES threads (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (nickname) REFERENCES users (nickname)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    UNIQUE (thread, nickname),
    CONSTRAINT votes_pk PRIMARY KEY (thread, nickname)
);

CREATE INDEX IF NOT EXISTS index_votes_double ON votes (nickname, thread);


-- Forum_users table and indexes



CREATE UNLOGGED TABLE
IF NOT EXISTS forum_users
(
	forum_slug      CITEXT     NOT NULL ,
	user_nickname   CITEXT     NOT NULL ,

    FOREIGN KEY (forum_slug) REFERENCES forums (slug),
    FOREIGN KEY (user_nickname) REFERENCES users (nickname),
	
    UNIQUE (forum_slug, user_nickname),
    CONSTRAINT forums_users_nicknames_pk PRIMARY KEY (forum_slug, user_nickname)
);

CREATE INDEX IF NOT EXISTS index_forum_users_double ON forum_users (user_nickname, forum_slug);

CREATE OR REPLACE FUNCTION add_path_to_post()
RETURNS TRIGGER AS $add_path_to_post$
DECLARE
        parent_path BIGINT[];
BEGIN
    IF (NEW.parent IS NULL) OR (NEW.parent = 0) THEN
        NEW.path := NEW.path || NEW.id;
    ELSE
        SELECT path
        FROM posts
            WHERE id = NEW.parent AND thread = NEW.thread
        INTO parent_path;

        IF ((parent_path IS NULL)
            OR
            (array_length(parent_path, 1) = 0)) THEN
            RAISE EXCEPTION 'parent error';
        END IF;

        NEW.path := NEW.path || parent_path || NEW.id;
    END IF;
        RETURN NEW;
END;
$add_path_to_post$ LANGUAGE  plpgsql;

-- DROP TRIGGER IF EXISTS tr_add_path_to_post
-- ON posts;

CREATE TRIGGER tr_add_path_to_post before
INSERT ON posts FOR EACH ROW
EXECUTE PROCEDURE add_path_to_post();

--  insert_votes

-- DROP FUNCTION IF EXISTS insert_votes() CASCADE;
CREATE OR REPLACE FUNCTION insert_votes() RETURNS TRIGGER AS
$insert_votes$
BEGIN
    UPDATE threads
    SET votes = votes + NEW.voice
    WHERE id = NEW.thread;

    RETURN NULL;
END;
$insert_votes$ LANGUAGE plpgsql;

CREATE TRIGGER insert_vote_after_insert_on_threads
    AFTER INSERT
    ON votes
    FOR EACH ROW
EXECUTE PROCEDURE insert_votes();

-- update_votes

-- DROP FUNCTION IF EXISTS update_votes() CASCADE;
CREATE OR REPLACE FUNCTION update_votes() RETURNS TRIGGER AS
$update_votes$
BEGIN
    UPDATE threads
    SET votes = votes + NEW.voice - OLD.voice
    WHERE id = NEW.thread;

    RETURN NULL;
END;
$update_votes$ LANGUAGE plpgsql;

CREATE TRIGGER update_vote_after_insert_on_threads
    AFTER UPDATE
    ON votes
    FOR EACH ROW
EXECUTE PROCEDURE update_votes();

--

-- DROP FUNCTION IF EXISTS add_new_forum_user() CASCADE;
CREATE OR REPLACE FUNCTION add_new_forum_user() RETURNS TRIGGER AS
$add_forum_user$
BEGIN
    INSERT INTO forum_users (forum_slug, user_nickname)
    VALUES (NEW.forum, NEW.author)
    ON CONFLICT DO NOTHING;

    RETURN NULL;
END;
$add_forum_user$ LANGUAGE plpgsql;

CREATE TRIGGER add_new_forum_user_after_insert_in_threads
    AFTER INSERT
    ON posts
    FOR EACH ROW
EXECUTE PROCEDURE add_new_forum_user();


-- CREATE OR REPLACE FUNCTION add_posts_into_forums() RETURNS TRIGGER AS
-- $add_posts_into_forums$
-- BEGIN
--     UPDATE forums 
--     SET posts = posts 
-- END
-- $add_posts_into_forums$ LANGUAGE plpgsql;


ANALYZE;
VACUUM ANALYZE;