-- Petit Bac : une partie entre nous deux, en manches (une lettre, les mêmes catégories).
--   mode : direct (en même temps, « Stop ! ») ou rythme (chacun quand il veut, 3 min chrono)
--   categories : la liste des catégories de la partie, en JSON (["Prénom", "Pays", …])
create table petit_bac_game (
    id          bigserial    primary key,
    owner_id    bigint       not null references app_user (id),
    partner_id  bigint       not null references app_user (id),
    mode        varchar(8)   not null,
    categories  jsonb        not null,
    created_at  timestamptz  not null,
    updated_at  timestamptz  not null
);
create index petit_bac_game_recent on petit_bac_game (updated_at desc);

-- Une manche : sa lettre (tenue secrète jusqu'au départ), quand elle a démarré (direct : les deux prêts),
-- quand quelqu'un a crié « Stop ! » (direct), et quand les scores sont tombés.
create table petit_bac_round (
    id          bigserial    primary key,
    game_id     bigint       not null references petit_bac_game (id) on delete cascade,
    number      int          not null,
    letter      varchar(1)   not null,
    created_at  timestamptz  not null,
    started_at  timestamptz,
    stop_at     timestamptz,
    stopped_by  bigint       references app_user (id),
    finished_at timestamptz,
    unique (game_id, number)
);

-- La feuille d'un joueur pour une manche : ses réponses (une par catégorie), celles de l'autre qu'il refuse
-- (leurs numéros), et ses points une fois que les deux ont validé.
create table petit_bac_entry (
    id           bigserial    primary key,
    round_id     bigint       not null references petit_bac_round (id) on delete cascade,
    player_id    bigint       not null references app_user (id),
    ready        boolean      not null default false,
    started_at   timestamptz,
    answers      jsonb        not null,
    done_at      timestamptz,
    rejected     jsonb        not null,
    validated_at timestamptz,
    score        int,
    unique (round_id, player_id)
);
