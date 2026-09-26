-- Quiz: each person's best result per level, and their own answers for "Toi & moi".
create table quiz_progress (
    id         bigint generated always as identity primary key,
    user_id    bigint      not null references app_user (id),
    level_key  varchar(40) not null,             -- "<theme>:<level>" or "toi"
    stars      smallint    not null default 0,
    best_score int         not null default 0,
    updated_at timestamptz not null default now(),
    constraint uq_quiz_progress unique (user_id, level_key)
);

create table quiz_self_answer (
    id          bigint generated always as identity primary key,
    user_id     bigint      not null references app_user (id),
    question_id varchar(20) not null,
    choice      smallint    not null,
    constraint uq_quiz_self_answer unique (user_id, question_id)
);
