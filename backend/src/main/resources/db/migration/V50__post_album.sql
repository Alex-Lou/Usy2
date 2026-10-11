-- Une publication dont les photos ont aussi été rangées dans un album (« Voir l'album »).
-- L'album supprimé, la publication reste (sans le lien).
alter table post add column album_id bigint references album (id) on delete set null;
