-- Shared look of the app, set by either person (each one's own choices still
-- win): general fonts, accent colour, background (a preset or a photo), the
-- default font/size of the messages. Plus each person's light/dark mode, kept
-- on the server so all their devices agree.
alter table couple_settings
    add column app_font            varchar(20),
    add column app_heading_font    varchar(20),
    add column accent_color        varchar(7),
    add column background          varchar(20),
    add column background_asset_id bigint references asset (id) on delete set null,
    add column chat_font           varchar(20),
    add column chat_size           varchar(4);

alter table app_user
    add column color_mode varchar(10);
