-- Mots fléchés : une grille générée, jouée seul ou à deux (shared).
-- solution / letters / authors : un caractère par case, ligne par ligne.
--   solution : la lettre attendue, ou # (case sans lettre)
--   letters  : la lettre posée, . si vide, # comme la solution
--   authors  : qui l'a posée — a (celui qui a créé la grille), b (l'autre), * (révélée), . (personne)
create table crossword_game (
    id          bigserial    primary key,
    owner_id    bigint       not null references app_user (id),
    size        varchar(8)   not null,
    shared      boolean      not null,
    width       int          not null,
    height      int          not null,
    clues       jsonb        not null,
    solution    text         not null,
    letters     text         not null,
    authors     text         not null,
    created_at  timestamptz  not null,
    updated_at  timestamptz  not null,
    finished_at timestamptz
);
create index crossword_game_recent on crossword_game (updated_at desc);
