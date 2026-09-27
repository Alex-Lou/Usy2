-- How each person likes to read the messages (their own screen only): a font
-- from the app's list and a text size. Null = the app's defaults.
alter table app_user
    add column reading_font varchar(20),
    add column reading_size varchar(4);
