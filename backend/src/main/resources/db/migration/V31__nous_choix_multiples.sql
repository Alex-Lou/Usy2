-- 💞 Nous deux: several choices can be ticked. They are kept as a bit set
-- ("choices", bit i = option i); the single choice already given is carried
-- over (the old "choice" column stays, unused).
alter table nous_answer add column choices integer;
update nous_answer set choices = 1 << choice::int where choice is not null;
alter table nous_answer drop constraint ck_nous_answer;
alter table nous_answer add constraint ck_nous_answer check (choices is not null or answer_text is not null);

alter table nous_guess add column choices integer;
update nous_guess set choices = 1 << choice::int where choice is not null;
