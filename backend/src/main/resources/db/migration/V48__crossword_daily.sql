-- Mots fléchés : la grille du jour, la même pour nous deux (une seule par jour, heure de Paris).
-- Null pour les grilles lancées à la main.
alter table crossword_game add column daily_date date;
create unique index crossword_game_daily on crossword_game (daily_date) where daily_date is not null;
