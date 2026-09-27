-- 🚢 Bataille navale à deux, tour par tour : chaque flotte et chaque tir restent
-- côté serveur (l'autre ne voit un bateau qu'une fois coulé). Le thème de la
-- partie (océan néon, cartoon, pirates, espace) est choisi par qui lance la
-- toute première partie, puis par le gagnant de la précédente.
create table naval_game (
    id           bigint generated always as identity primary key,
    host_id      bigint       not null references app_user (id),  -- who started it
    guest_id     bigint       not null references app_user (id),
    theme        varchar(12)  not null,
    next_theme   varchar(12),                                     -- the winner's pick for the next game
    status       varchar(10)  not null,                           -- placing / playing / done
    host_fleet   text,                                            -- JSON: each ship's cells (0..99), null until placed
    guest_fleet  text,
    host_shots   text         not null default '[]',              -- JSON: cells the host shot at, in order
    guest_shots  text         not null default '[]',
    turn_id      bigint       references app_user (id),
    winner_id    bigint       references app_user (id),
    ended_reason varchar(10),                                     -- sunk / abandon
    created_at   timestamptz  not null default now(),
    updated_at   timestamptz  not null default now(),
    version      int          not null default 0
);

create index ix_naval_game_status on naval_game (status);
