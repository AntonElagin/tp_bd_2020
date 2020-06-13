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

CREATE TABLE
IF NOT EXISTS users
(
    id          BIGSERIAL   PRIMARY KEY,
    nickname    CITEXT      UNIQUE NOT NULL,
    fullname    VARCHAR,
    about       TEXT,
    email       CITEXT      UNIQUE
);



CREATE UNIQUE INDEX
IF NOT EXISTS index_users_email
    ON users
(email);
CREATE UNIQUE INDEX
IF NOT EXISTS index_users_nickname
    ON users
(nickname);
CREATE INDEX
IF NOT EXISTS index_users_all
    ON users
(nickname, email, about, fullname);



CREATE TABLE
IF NOT EXISTS forums
(
    id      BIGSERIAL   PRIMARY KEY,
    slug    CITEXT      UNIQUE NOT NULL,
    title   VARCHAR     NOT NULL,
    user_id BIGINT      NOT NULL REFERENCES users(id),
    user_nickname  CITEXT      NOT NULL REFERENCES users(nickname),
    posts           INTEGER     DEFAULT 0,
    threads         INTEGER     DEFAULT 0
);

CREATE INDEX
IF NOT EXISTS index_forums_slug ON forums
(slug);

CREATE TABLE
IF NOT EXISTS threads
(
    id              BIGSERIAL  PRIMARY KEY,
    slug            CITEXT     UNIQUE,
    author_id       BIGINT     NOT NULL REFERENCES users (id),
    author_nickname CITEXT     NOT NULL REFERENCES users (nickname),
    forum_id        BIGINT     NOT NULL REFERENCES forums (id),
    forum_slug      CITEXT     NOT NULL REFERENCES forums (slug),
    created         TIMESTAMP WITH TIME ZONE    DEFAULT NOW(),
    title           VARCHAR    NOT NULL,
    message         VARCHAR    NOT NULL,
    votes           INTEGER    DEFAULT 0
);

CREATE INDEX
IF NOT EXISTS index_threads_slug ON threads
(slug);
CREATE INDEX
IF NOT EXISTS index_threads_id ON threads
(id);


CREATE TABLE
IF NOT EXISTS posts
(
    id                  BIGSERIAL PRIMARY KEY,
    author_id           BIGSERIAL NOT NULL REFERENCES users(id),
    author_nickname     CITEXT    NOT NULL REFERENCES users(nickname),
    forum_id            BIGINT    NOT NULL REFERENCES forums(id),
    forum_slug          CITEXT    NOT NULL REFERENCES forums(slug),
    thread_id           BIGINT    NOT NULL REFERENCES threads(id),
    thread_slug         CITEXT    REFERENCES threads(slug),
    created             TIMESTAMP WITH TIME ZONE    DEFAULT NOW(),
    isEdited            BOOLEAN   DEFAULT FALSE,
    message             VARCHAR   NOT NULL,
    parent              BIGINT    NULL REFERENCES posts(id),
    path_to_this_post   BIGINT[]
);

CREATE INDEX
IF NOT EXISTS index_posts_path_to_this_post ON posts USING GIN(path_to_this_post);

CREATE TABLE
IF NOT EXISTS votes
(
    id              BIGSERIAL   PRIMARY KEY,
    nickname        CITEXT      NOT NULL REFERENCES users(nickname),
    thread          BIGINT      NOT NULL REFERENCES threads(id),
    voice           INTEGER     DEFAULT 0,
    CONSTRAINT unique_vote UNIQUE(nickname, thread)
);

CREATE INDEX
IF NOT EXISTS index_votes_double ON votes
(nickname, thread);

CREATE TABLE
IF NOT EXISTS forum_users
(
	forum_id        BIGINT     NOT NULL REFERENCES forums(id),
	user_id         BIGINT     NOT NULL REFERENCES users(id),
	CONSTRAINT unique_user_in_forum UNIQUE(user_id, forum_id)
);

CREATE INDEX
IF NOT EXISTS index_forum_users_double ON forum_users (user_id, forum_id);

CREATE OR REPLACE FUNCTION add_path_to_post()
RETURNS TRIGGER AS $add_path_to_post$
DECLARE
        parent_path BIGINT[];
BEGIN
    IF (NEW.parent IS NULL) OR (NEW.parent = 0) THEN
            NEW.path_to_this_post := NEW.path_to_this_post || NEW.id;
        ELSE
            SELECT path_to_this_post
    FROM posts
    WHERE id = NEW.parent
    INTO parent_path;
NEW.path_to_this_post := NEW.path_to_this_post || parent_path || NEW.id;
END
IF;
        RETURN NEW;
END;
$add_path_to_post$ LANGUAGE  plpgsql;

DROP TRIGGER IF EXISTS tr_add_path_to_post
ON posts;

CREATE TRIGGER tr_add_path_to_post BEFORE
INSERT ON
posts
FOR
EACH
ROW
EXECUTE PROCEDURE add_path_to_post
();


CREATE FUNCTION fn_update_thread_votes_ins()
    RETURNS TRIGGER AS '
    BEGIN
        UPDATE threads
        SET
            votes = votes + NEW.voice
        WHERE id = NEW.thread;
        RETURN NULL;
    END;
' LANGUAGE plpgsql;


CREATE TRIGGER on_vote_insert
    AFTER
INSERT ON
votes
FOR
EACH
ROW
EXECUTE PROCEDURE fn_update_thread_votes_ins
();

CREATE FUNCTION fn_update_thread_votes_upd()
    RETURNS TRIGGER AS '
    BEGIN
        IF OLD.voice = NEW.voice
        THEN
            RETURN NULL;
        END IF;
        UPDATE threads
        SET
            votes = votes + CASE WHEN NEW.voice = -1
                                     THEN -2
                                 ELSE 2 END
        WHERE id = NEW.thread;
        RETURN NULL;
    END;
' LANGUAGE plpgsql;

CREATE TRIGGER on_vote_update
    AFTER
UPDATE ON votes
    FOR EACH ROW
EXECUTE PROCEDURE fn_update_thread_votes_upd
();


