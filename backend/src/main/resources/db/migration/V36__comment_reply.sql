-- 💬 Replies: a comment can answer another one of the same post (one level:
-- a reply to a reply joins the same thread). Deleting a comment deletes its replies.
alter table comment add column parent_id bigint references comment (id) on delete cascade;
create index idx_comment_parent on comment (parent_id);
