-- Coches du chat : ✓ envoyé, ✓✓ reçu (delivered_at), ✓✓ en couleur lu (read_at).
-- Les messages déjà là sont considérés comme reçus (ils ont été affichés depuis longtemps).
alter table message add column delivered_at timestamptz;
update message set delivered_at = coalesce(read_at, created_at);
