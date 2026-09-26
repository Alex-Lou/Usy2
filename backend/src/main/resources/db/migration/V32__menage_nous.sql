-- Ménage (confirmé par Lou) : ce qui ne sert plus depuis 💞 Nous deux.
-- "choice" (un seul choix) est remplacé par "choices" (V31) ; les réponses
-- « Toi & moi » ont été copiées dans nous_answer (V30).
alter table nous_answer drop column choice;
alter table nous_guess drop column choice;
drop table quiz_self_answer;
