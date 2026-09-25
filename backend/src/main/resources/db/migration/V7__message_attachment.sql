-- A chat message can carry one attachment (photo, GIF or document). The text
-- may then be empty. Deleting the file keeps the message.
alter table message add column attachment_asset_id bigint references asset (id) on delete set null;
