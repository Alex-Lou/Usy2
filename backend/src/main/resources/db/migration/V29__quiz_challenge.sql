-- Quiz "défi à tour de rôle": one plays 10 questions, the other then gets the very same ones.
create table quiz_challenge (
    id            bigint generated always as identity primary key,
    from_user_id  bigint      not null references app_user (id),
    to_user_id    bigint      not null references app_user (id),
    theme         varchar(40) not null,            -- a theme id, or "mix"
    level         smallint    not null default 0,  -- 0 for "mix"
    items         text        not null,            -- JSON: [{"t": question, "o": [options], "c": right index}]
    from_score    int         not null,
    from_marks    varchar(20) not null,            -- one character per question: 1 right, 0 wrong
    to_score      int         not null default 0,
    to_marks      varchar(20) not null default '', -- grows answer by answer (a closed app resumes there)
    to_started_at timestamptz,
    created_at    timestamptz not null default now(),
    finished_at   timestamptz
);

create index ix_quiz_challenge_from on quiz_challenge (from_user_id, created_at);
create index ix_quiz_challenge_to on quiz_challenge (to_user_id, created_at);
