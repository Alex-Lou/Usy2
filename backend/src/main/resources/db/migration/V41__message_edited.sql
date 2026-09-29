-- Modifier un message envoyé : quand il a été modifié pour la dernière fois (null : jamais).
alter table message add column edited_at timestamptz;
