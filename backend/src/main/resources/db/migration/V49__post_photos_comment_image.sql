-- Plusieurs photos par publication (affichées en carrousel), dans leur ordre. La première reste
-- aussi dans post.image_asset_id : aperçus de notification, souvenirs, recherche, « Notre année ».
create table post_photo (
    post_id  bigint not null references post (id) on delete cascade,
    position int    not null,
    asset_id bigint not null references asset (id),
    primary key (post_id, position)
);
create index idx_post_photo_asset on post_photo (asset_id);

-- Les publications d'avant : leur photo devient la première (et seule) de la liste.
insert into post_photo (post_id, position, asset_id)
select id, 0, image_asset_id from post where image_asset_id is not null;

-- Une photo ou un GIF dans un commentaire.
alter table comment add column image_asset_id bigint references asset (id);
