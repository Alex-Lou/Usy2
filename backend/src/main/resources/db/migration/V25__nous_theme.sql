-- The look of "Notre profil" (our shared space), chosen by the two of us:
-- its page background and its cards, as validated JSON (see NousThemeService).
-- Null: the app's shared look.
alter table couple_settings add column nous_theme_json jsonb;
