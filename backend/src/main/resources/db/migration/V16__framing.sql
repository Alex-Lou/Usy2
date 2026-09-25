-- How an image sits in its frame, as "x,y,zoom" (see Framing): which part of
-- the photo shows and how much it is enlarged. Null = centred, no zoom. The
-- original photo is always kept, so the framing can be changed later.
alter table app_user add column avatar_framing varchar(40);
alter table profile add column cover_framing varchar(40);
alter table album add column cover_framing varchar(40);
