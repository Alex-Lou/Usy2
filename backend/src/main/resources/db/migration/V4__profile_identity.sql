-- Identity fields shown next to a user's name everywhere (feed, chat, profile):
-- an optional profile photo and the chosen companion animal. Bio lives on the
-- profile (the customizable space).
alter table app_user add column avatar_asset_id bigint references asset (id) on delete set null;
alter table app_user add column companion varchar(20) not null default 'cat';
alter table profile add column bio varchar(200);
