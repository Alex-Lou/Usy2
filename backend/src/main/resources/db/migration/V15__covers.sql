-- Covers: a chosen photo for the profile banner, and a chosen photo as an
-- album's cover (else its first photo, as before). Removing the photo or the
-- file simply falls back.
alter table profile add column cover_asset_id bigint references asset (id) on delete set null;
alter table album add column cover_photo_id bigint references photo (id) on delete set null;
