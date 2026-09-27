-- Store uploaded file bytes in the database so they survive restarts.
-- On free hosting the local disk is ephemeral (reclaimed on sleep/restart),
-- which made uploaded photos disappear while their asset rows remained.
-- Kept in a separate table from `asset` so listing metadata never loads blobs.
create table asset_content (
    asset_id bigint primary key references asset (id) on delete cascade,
    bytes    bytea not null
);
