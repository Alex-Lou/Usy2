-- A photo edited in the studio can carry an animated effect, replayed wherever
-- it is shown (the image itself is stored once, as a normal still picture).
alter table asset add column effect varchar(16);
