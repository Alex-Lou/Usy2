-- One emoji reaction per person on a chat message (like WhatsApp): choosing
-- another emoji replaces it, choosing the same one again removes it.
create table message_reaction (
    id         bigint generated always as identity primary key,
    message_id bigint      not null references message (id) on delete cascade,
    user_id    bigint      not null references app_user (id) on delete cascade,
    emoji      varchar(16) not null,
    created_at timestamptz not null default now(),
    unique (message_id, user_id)
);
