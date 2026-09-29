-- Taille des photos (lue dans l'en-tête à l'envoi) : leur cadre a la bonne forme avant chargement.
-- Null pour les fichiers qui ne sont pas des images ; les anciennes photos sont remplies au démarrage.
alter table asset add column width integer;
alter table asset add column height integer;
