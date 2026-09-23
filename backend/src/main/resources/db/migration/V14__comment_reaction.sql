-- One emoji reaction per person on a post comment (same rule as chat messages).
create table comment_reaction (
    id         bigint generated always as identity primary key,
    comment_id bigint      not null references comment (id) on delete cascade,
    user_id    bigint      not null references app_user (id) on delete cascade,
    emoji      varchar(16) not null,
    created_at timestamptz not null default now(),
    unique (comment_id, user_id)
);
