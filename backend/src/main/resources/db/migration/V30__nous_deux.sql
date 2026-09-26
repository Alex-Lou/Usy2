-- 💞 Nous deux: what each one answered about themself, the other's guesses
-- (with the verdict of the one it is about), and favourite / "on en a parlé" cards.
create table nous_answer (
    id          bigint generated always as identity primary key,
    user_id     bigint       not null references app_user (id),
    question_id varchar(20)  not null,
    choice      smallint,
    answer_text varchar(280),
    updated_at  timestamptz  not null default now(),
    constraint uq_nous_answer unique (user_id, question_id),
    constraint ck_nous_answer check (choice is not null or answer_text is not null)
);

-- "Toi & moi" moves here: its answers are copied (quiz_self_answer is left as it is).
insert into nous_answer (user_id, question_id, choice)
select user_id, question_id, choice from quiz_self_answer;

create table nous_guess (
    id          bigint generated always as identity primary key,
    guesser_id  bigint       not null references app_user (id),
    author_id   bigint       not null references app_user (id),
    question_id varchar(20)  not null,
    choice      smallint,
    guess_text  varchar(280),
    verdict     varchar(8),              -- right / close / wrong; null = waiting for the author
    note        varchar(140),            -- the author's word with the verdict
    created_at  timestamptz  not null default now(),
    judged_at   timestamptz,
    constraint uq_nous_guess unique (guesser_id, question_id)
);

create index ix_nous_guess_author on nous_guess (author_id, verdict);

create table nous_mark (
    id          bigint generated always as identity primary key,
    user_id     bigint       not null references app_user (id),
    question_id varchar(20)  not null,
    kind        varchar(8)   not null,   -- fav / talked
    created_at  timestamptz  not null default now(),
    constraint uq_nous_mark unique (user_id, question_id, kind)
);
