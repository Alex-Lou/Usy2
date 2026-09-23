-- The couple's shared cat (single row). Satiety and happiness are stored as of
-- stats_at and decay with time when read; actions bring them back up.
create table pet (
    id             smallint primary key check (id = 1),
    name           varchar(24) not null default 'Moka',
    satiety        smallint    not null default 70 check (satiety between 0 and 100),
    happiness      smallint    not null default 70 check (happiness between 0 and 100),
    stats_at       timestamptz not null default now(),
    last_action    varchar(10),
    last_actor_id  bigint      references app_user (id) on delete set null,
    last_action_at timestamptz
);
insert into pet (id) values (1);
