-- 🏡 The house, decorated freely: one layout per scene (inside, outside),
-- the objects placed there as JSON (see HouseService), and a gift of
-- 10 000 coins to the shared purse to start decorating.
create table house_layout (
    scene      varchar(10) primary key check (scene in ('inside', 'outside')),
    items      text        not null default '[]',
    version    int         not null default 0,
    updated_at timestamptz not null default now(),
    updated_by bigint      references app_user (id) on delete set null
);

insert into house_layout (scene) values ('inside'), ('outside');

update pet set coins = coins + 10000;
