-- Défi photo de la semaine : un thème par semaine (lundi = week_start), une photo chacun.
-- Le joker : chacun peut remplacer le thème de la semaine une fois, tant que personne n'a posté.
create table photo_challenge_joker (
    week_start date        not null,
    user_id    bigint      not null references app_user (id),
    theme      varchar(80) not null,
    created_at timestamptz not null,
    primary key (week_start, user_id)
);

create table photo_challenge_entry (
    id         bigserial    primary key,
    week_start date         not null,
    author_id  bigint       not null references app_user (id),
    asset_id   bigint       not null references asset (id),
    caption    varchar(200),
    created_at timestamptz  not null,
    constraint photo_challenge_entry_week_author unique (week_start, author_id)
);
create index photo_challenge_entry_week on photo_challenge_entry (week_start);
