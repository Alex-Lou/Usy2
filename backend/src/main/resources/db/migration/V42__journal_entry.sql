-- Carnet d'une ligne par jour : au plus une ligne par personne et par jour (jour du couple).
create table journal_entry (
    id         bigserial    primary key,
    author_id  bigint       not null references app_user (id),
    day        date         not null,
    text       varchar(280) not null,
    created_at timestamptz  not null,
    updated_at timestamptz  not null,
    constraint journal_entry_author_day unique (author_id, day)
);
create index journal_entry_day on journal_entry (day);
