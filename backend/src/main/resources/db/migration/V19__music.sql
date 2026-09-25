-- "Musique": playlists both people edit. A track is a name (+ artist), and
-- optionally a web link that Patotube can open; a short note.

create table playlist (
    id            bigint generated always as identity primary key,
    name          varchar(40) not null,
    emoji         varchar(16),
    created_by_id bigint      not null references app_user (id),
    created_at    timestamptz not null default now()
);

create table playlist_track (
    id          bigint generated always as identity primary key,
    playlist_id bigint        not null references playlist (id) on delete cascade,
    position    integer       not null,
    title       varchar(120)  not null,
    artist      varchar(80),
    url         varchar(2048),
    note        varchar(200),
    added_by_id bigint        not null references app_user (id),
    created_at  timestamptz   not null default now()
);
create index idx_playlist_track_playlist on playlist_track (playlist_id, position);
