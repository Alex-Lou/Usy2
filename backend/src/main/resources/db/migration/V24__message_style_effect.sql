-- A message can be sent with a bubble style (shout, whisper, shake) and a
-- full-screen effect played for both (confetti, hearts...). Both optional:
-- existing messages keep null. Closed lists, also checked by the server.
alter table message add column style varchar(16)
    check (style in ('shout', 'whisper', 'shake'));
alter table message add column effect varchar(16)
    check (effect in ('confetti', 'hearts', 'fireworks', 'balloons', 'stars', 'kisses'));
