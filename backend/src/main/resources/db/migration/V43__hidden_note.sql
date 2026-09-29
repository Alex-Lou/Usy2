-- Mot caché : un petit mot glissé derrière une photo (d'album ou de post), que l'autre découvre en l'ouvrant.
create table hidden_note (
    id         bigserial    primary key,
    author_id  bigint       not null references app_user (id),
    asset_id   bigint       not null references asset (id) on delete cascade,
    text       varchar(280) not null,
    created_at timestamptz  not null,
    found_at   timestamptz
);
create index hidden_note_asset on hidden_note (asset_id);
