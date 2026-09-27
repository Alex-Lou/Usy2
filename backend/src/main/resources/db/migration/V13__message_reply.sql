-- A chat message can answer an earlier one (shown quoted above it, like WhatsApp).
alter table message add column reply_to_id bigint references message (id) on delete set null;
