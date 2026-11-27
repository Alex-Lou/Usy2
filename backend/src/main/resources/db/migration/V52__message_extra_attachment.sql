-- A message can carry up to 10 photos or files sent together (shown as a
-- grid). The first one stays in message.attachment_asset_id, as before; the
-- others are here, in order. Deleting a file only removes it from the message.
create table message_extra_attachment (
    id         bigint generated always as identity primary key,
    message_id bigint   not null references message (id) on delete cascade,
    asset_id   bigint   not null references asset (id) on delete cascade,
    position   smallint not null,
    unique (message_id, position)
);
