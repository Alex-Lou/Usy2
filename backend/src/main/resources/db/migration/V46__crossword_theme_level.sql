-- Mots fléchés : un thème (melange, cuisine, nature…) et un niveau (facile, moyen, difficile) par grille.
-- Les grilles déjà jouées étaient en mélange, avec les définitions faciles.
alter table crossword_game add column theme varchar(16) not null default 'melange';
alter table crossword_game add column level varchar(12) not null default 'facile';
