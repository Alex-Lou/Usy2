-- The cat's house: two more needs, a shared purse earned by caring for it
-- (capped per day), and the accessories bought with it.
alter table pet add column cleanliness smallint not null default 80 check (cleanliness between 0 and 100);
alter table pet add column energy      smallint not null default 80 check (energy between 0 and 100);
alter table pet add column coins       int      not null default 0  check (coins >= 0);
alter table pet add column coins_today int      not null default 0;
alter table pet add column coins_day   date;

create table pet_item (
    item      varchar(20) primary key,
    equipped  boolean     not null default false,
    bought_at timestamptz not null default now()
);
