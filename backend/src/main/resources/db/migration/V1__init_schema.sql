-- MemoCat V1 schema.
-- Note: "user" is a reserved word in PostgreSQL, so the users table is named app_user.

create table app_user (
    id            bigint generated always as identity primary key,
    username      varchar(50)  not null unique,
    password_hash varchar(100) not null,
    display_name  varchar(100) not null,
    created_at    timestamptz  not null default now()
);

create table asset (
    id                bigint generated always as identity primary key,
    storage_key       varchar(255) not null unique,
    original_filename varchar(255) not null,
    content_type      varchar(100) not null,
    size_bytes        bigint       not null,
    uploader_id       bigint       not null references app_user (id),
    created_at        timestamptz  not null default now()
);

create table profile (
    id              bigint generated always as identity primary key,
    user_id         bigint      not null unique references app_user (id),
    theme_json      jsonb       not null default '{}'::jsonb,
    widgets_json    jsonb       not null default '[]'::jsonb,
    banner_asset_id bigint      references asset (id),
    updated_at      timestamptz not null default now()
);

create table post (
    id             bigint generated always as identity primary key,
    author_id      bigint      not null references app_user (id),
    text           text        not null,
    image_asset_id bigint      references asset (id),
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    edited         boolean     not null default false
);
create index idx_post_created_at on post (created_at desc);

create table comment (
    id         bigint generated always as identity primary key,
    post_id    bigint      not null references post (id) on delete cascade,
    author_id  bigint      not null references app_user (id),
    text       text        not null,
    created_at timestamptz not null default now()
);
create index idx_comment_post on comment (post_id, created_at);

create table reaction (
    id         bigint generated always as identity primary key,
    post_id    bigint      not null references post (id) on delete cascade,
    user_id    bigint      not null references app_user (id),
    emoji      varchar(32) not null,
    created_at timestamptz not null default now(),
    constraint uq_reaction unique (post_id, user_id, emoji)
);
create index idx_reaction_post on reaction (post_id);

create table album (
    id          bigint generated always as identity primary key,
    creator_id  bigint       not null references app_user (id),
    title       varchar(150) not null,
    description text,
    created_at  timestamptz  not null default now()
);

create table photo (
    id          bigint generated always as identity primary key,
    album_id    bigint       not null references album (id) on delete cascade,
    asset_id    bigint       not null references asset (id),
    uploader_id bigint       not null references app_user (id),
    caption     varchar(500),
    position    int          not null default 0,
    created_at  timestamptz  not null default now()
);
create index idx_photo_album on photo (album_id, position);

create table message (
    id         bigint generated always as identity primary key,
    sender_id  bigint      not null references app_user (id),
    content    text        not null,
    created_at timestamptz not null default now(),
    read_at    timestamptz
);
create index idx_message_created_at on message (created_at);
