CREATE EXTENSION
IF NOT EXISTS CITEXT;

DROP TABLE IF EXISTS users
CASCADE;
DROP TABLE IF EXISTS forums
CASCADE;
DROP TABLE IF EXISTS threads
CASCADE;
DROP TABLE IF EXISTS posts
CASCADE;
DROP TABLE IF EXISTS votes
CASCADE;
DROP TABLE IF EXISTS forum_users
CASCADE;

CREATE UNLOGGED TABLE
IF NOT EXISTS users
(
    nickname    CITEXT PRIMARY KEY UNIQUE NOT NULL,
    fullname    VARCHAR,
    about       TEXT,
    email       CITEXT      UNIQUE
);



CREATE UNIQUE INDEX IF NOT EXISTS index_users_email
    ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS index_users_nickname
    ON users (nickname);
CREATE INDEX IF NOT EXISTS index_users_all
    ON users (nickname, email, about, fullname);



CREATE UNLOGGED TABLE
IF NOT EXISTS forums
(
    slug    CITEXT PRIMARY KEY UNIQUE NOT NULL,
    title   VARCHAR     NOT NULL,
    author    CITEXT      NOT NULL,
    posts   INTEGER     DEFAULT 0,
    threads INTEGER     DEFAULT 0
);

CREATE INDEX IF NOT EXISTS index_forums_slug 
    ON forums (slug);

CREATE UNLOGGED TABLE
IF NOT EXISTS threads
(
    id              BIGSERIAL  PRIMARY KEY UNIQUE NOT NULL,
    slug            CITEXT     UNIQUE,
    author          CITEXT     NOT NULL,
    forum           CITEXT     NOT NULL,
    created         TIMESTAMP WITH TIME ZONE    DEFAULT NOW(),
    title           VARCHAR    NOT NULL,
    message         VARCHAR    NOT NULL,
    votes           INTEGER    DEFAULT 0 NOT NULL
);

CREATE INDEX
IF NOT EXISTS index_threads_slug ON threads
(slug);
CREATE INDEX
IF NOT EXISTS index_threads_id ON threads
(id);


CREATE UNLOGGED TABLE
IF NOT EXISTS posts
(
    id        BIGSERIAL PRIMARY KEY UNIQUE NOT NULL,
    author    CITEXT    NOT NULL ,
    forum     CITEXT    NOT NULL ,
    thread    CITEXT    NOT NULL,
    created   TIMESTAMP WITH TIME ZONE    DEFAULT NOW(),
    isEdited  BOOLEAN   DEFAULT FALSE,
    message   VARCHAR   NOT NULL,
    parent    BIGINT    NULL,
    path   BIGINT[]
);

CREATE INDEX IF NOT EXISTS idx_posts_path ON posts USING GIN (path);
CREATE INDEX IF NOT EXISTS idx_posts_thread ON posts (thread);
CREATE INDEX IF NOT EXISTS idx_posts_forum ON posts (forum);
CREATE INDEX IF NOT EXISTS idx_posts_parent ON posts (parent);
CREATE INDEX IF NOT EXISTS idx_posts_thread_id ON posts (thread, id);
CREATE INDEX IF NOT EXISTS idx_posts_pok
    ON posts (id, parent, thread, forum, author, created, message, isedited, path);
CREATE INDEX IF NOT EXISTS idx_posts_created
    ON posts (created);

CREATE UNLOGGED TABLE
IF NOT EXISTS votes
(
    nickname        CITEXT      NOT NULL,
    thread          BIGINT      NOT NULL,
    voice           INTEGER     DEFAULT 0,
    FOREIGN KEY (thread) REFERENCES threads (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (nickname) REFERENCES users (nickname)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT votes_unique UNIQUE (thread, nickname)
);

CREATE INDEX IF NOT EXISTS index_votes_double ON votes (nickname, thread);

CREATE UNLOGGED TABLE
IF NOT EXISTS forum_users
(
	forum_slug      CITEXT     NOT NULL ,
	user_nickname   CITEXT     NOT NULL ,
	
    UNIQUE (forum_slug, user_nickname),
    CONSTRAINT forums_users_nicknames_pk PRIMARY KEY (forum_slug, user_nickname)
);

CREATE INDEX IF NOT EXISTS index_forum_users_double ON forum_users (forum_slug, user_nickname);

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
    WHERE id = NEW.parent
    INTO parent_path;
NEW.path := NEW.path || parent_path || NEW.id;
END
IF;
        RETURN NEW;
END;
$add_path_to_post$ LANGUAGE  plpgsql;

DROP TRIGGER IF EXISTS tr_add_path_to_post
ON posts;

CREATE TRIGGER tr_add_path_to_post before
INSERT ON posts FOR EACH ROW
EXECUTE PROCEDURE add_path_to_post();


-- DROP FUNCTION IF EXISTS insert_vote() CASCADE;
-- CREATE OR REPLACE FUNCTION insert_vote() RETURNS TRIGGER AS
-- $insert_vote$
-- BEGIN
--     UPDATE threads
--     SET votes = votes + NEW.voice
--     WHERE id = NEW.thread;

--     RETURN NULL;
-- END;
-- $insert_vote$ LANGUAGE plpgsql;

-- CREATE TRIGGER insert_vote_after_insert_on_threads
--     AFTER INSERT
--     ON votes
--     FOR EACH ROW
-- EXECUTE PROCEDURE insert_vote();

-- --

-- DROP FUNCTION IF EXISTS update_vote() CASCADE;
-- CREATE OR REPLACE FUNCTION update_vote() RETURNS TRIGGER AS
-- $update_vote$
-- BEGIN
--     UPDATE threads
--     SET votes = votes + NEW.voice - OLD.voice
--     WHERE id = NEW.thread;

--     RETURN NULL;
-- END;
-- $update_vote$ LANGUAGE plpgsql;

-- CREATE TRIGGER update_vote_after_insert_on_threads
--     AFTER UPDATE
--     ON votes
--     FOR EACH ROW
-- EXECUTE PROCEDURE update_vote();


DROP FUNCTION IF EXISTS add_new_forum_user() CASCADE;
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


ANALYZE;
VACUUM ANALYZE;