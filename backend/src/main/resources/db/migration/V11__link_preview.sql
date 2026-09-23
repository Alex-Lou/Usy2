-- Cached previews of links posted in the app (title, description, thumbnail),
-- fetched once by the server so phones never contact third-party sites.
create table link_preview (
    url         varchar(2048) primary key,
    title       varchar(300),
    description varchar(600),
    site_name   varchar(120),
    image       bytea,
    image_type  varchar(20),
    fetched_at  timestamptz not null default now()
);
create index idx_link_preview_fetched_at on link_preview (fetched_at);
