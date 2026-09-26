-- ⚡ Parties en direct (duel quiz, « Même longueur d'onde ») : la même question
-- au même moment pour les deux, un chrono tenu par le serveur, et une pause
-- (jusqu'à 24 h) quand l'un·e ne répond pas à temps. Gardées en base pour
-- qu'une pause survive à un redémarrage.
create table live_game (
    id            bigint generated always as identity primary key,
    kind          varchar(8)   not null,             -- quiz / nous
    label         varchar(80)  not null,             -- "🎲 Mélange surprise", "💗 Tendres & souvenirs"…
    host_id       bigint       not null references app_user (id),
    guest_id      bigint       not null references app_user (id),
    items         text         not null,             -- JSON: the questions (with the right answer for the quiz)
    answers       text         not null default '[]', -- JSON: per question, each one's answer and points
    status        varchar(10)  not null,             -- invited / playing / paused / done / cancelled
    phase         varchar(8),                        -- question / reveal (while playing)
    idx           smallint     not null default 0,
    seconds       smallint     not null,
    deadline      timestamptz,                       -- end of the question's time, or of the reveal
    paused_at     timestamptz,
    host_score    int          not null default 0,
    guest_score   int          not null default 0,
    ended_reason  varchar(12),                       -- finished / expired / abandon / declined
    created_at    timestamptz  not null default now(),
    updated_at    timestamptz  not null default now(),
    version       int          not null default 0
);

create index ix_live_game_status on live_game (status);
