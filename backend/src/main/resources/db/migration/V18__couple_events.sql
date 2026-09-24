-- "Nos dates": events both people add to the shared calendar. A day, an
-- optional time, optionally every year (birthdays...). reminded_for is the
-- occurrence the "tomorrow" reminder was last sent for, so it goes out once.

create table couple_event (
    id            bigint generated always as identity primary key,
    title         varchar(60)  not null,
    day           date         not null,
    at_time       time,
    emoji         varchar(16),
    note          varchar(300),
    yearly        boolean      not null default false,
    reminded_for  date,
    created_by_id bigint       not null references app_user (id),
    created_at    timestamptz  not null default now()
);
create index idx_couple_event_day on couple_event (day);
