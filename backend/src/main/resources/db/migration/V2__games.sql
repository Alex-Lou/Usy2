-- Real-time games framework (starting with Morpion). Generic per-type state in jsonb.

create table game (
    id             bigint generated always as identity primary key,
    type           varchar(30)  not null,
    status         varchar(20)  not null,            -- 'active' | 'finished'
    state          jsonb        not null default '{}'::jsonb,
    turn_user_id   bigint       references app_user (id),
    winner_user_id bigint       references app_user (id),
    draw           boolean      not null default false,
    created_at     timestamptz  not null default now(),
    updated_at     timestamptz  not null default now()
);
-- At most one active game per type (the couple shares a single live board).
create unique index uq_active_game on game (type) where status = 'active';
create index idx_game_type on game (type);

create table game_score (
    id      bigint generated always as identity primary key,
    type    varchar(30) not null,
    user_id bigint      not null references app_user (id),
    wins    int         not null default 0,
    draws   int         not null default 0,
    losses  int         not null default 0,
    constraint uq_game_score unique (type, user_id)
);
