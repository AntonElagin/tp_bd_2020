create extension
if not exists citext;

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
    id       bigserial not null primary key,
    nickname citext not null unique,
    about    text,
    email    citext not null,
    fullname varchar
(100) not null
);


CREATE TABLE
IF NOT EXISTS forums
(
    id       bigserial   not null primary key,
    slug     citext      not null,
    user_id  bigserial   not null REFERENCES users
(id),
    -- user_nickname citext not null REFERENCES users(nickname),
    title    varchar,
    posts    int default 0,
    threads  int default 0
);

CREATE TABLE
IF NOT EXISTS threads
(
    id      serial not null primary key,
    slug    citext UNIQUE,
    title   varchar,
    message varchar,
    votes   int         default 0,
    author_id  bigserial NOT NULL users
(id),
    -- author_nickname citext NOT NULL REFERENCES users(nickname),
    forum_id   bigserial NOT NULL forums
(id),
    -- forum_slug citext NOT NULL REFERENCES forums(slug),
    created timestamptz DEFAULT now
()
);

CREATE TABLE
IF NOT EXISTS posts
(
    id       bigserial not null primary key,
    parent   bigint             DEFAULT NULL REFERENCES posts
(id),
    path     bigint[]  NOT NULL DEFAULT '{0}',
    thread_id bigserial REFERENCES threads
(id) NOT NULL,
    thread_slug citext REFERENCES threads
(slug),
    forum_id    bigserial NOT NULL REFERENCES forums
(id),
    forum_slug citext NOT NULL REFERENCES forums
(slug),
    author_id   bigserial NOT NULL REFERENCES users
(id),
    author_nickname citext NOT NULL REFERENCES users
(nickname),
    created  timestamptz        DEFAULT now
(),
    isEdited bool               DEFAULT FALSE,
    message  text
);

CREATE TABLE
IF NOT EXISTS votes
(
    nickname citext  REFERENCES users
(nickname) NOT NULL,
    thread   int      REFERENCES threads
(id) NOT NULL,
    voice    smallint NOT NULL CHECK
(voice = 1 OR voice = -1),
    PRIMARY KEY
(nickname, thread)
);

CREATE TABLE
IF NOT EXISTS forum_users
(
    user_id BIGINT REFERENCES users
(id),
    forum_id BIGINT REFERENCES forums
(id)
);