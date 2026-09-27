-- 💞 Nous deux (confirmé par Lou) : nouveaux formats et remise à zéro.
-- Classement : l'ordre choisi ("2,0,3,1"). Pendu : les lettres déjà essayées.
alter table nous_answer add column ranking varchar(40);
alter table nous_guess add column ranking varchar(40);
alter table nous_guess add column letters varchar(40);
alter table nous_answer drop constraint ck_nous_answer;
alter table nous_answer add constraint ck_nous_answer
    check (choices is not null or answer_text is not null or ranking is not null);

-- Remise à zéro « pour les deux » : proposée par l'un, en attente de l'accord de l'autre.
create table nous_reset (
    id           bigint generated always as identity primary key,
    requested_by bigint      not null references app_user (id),
    theme        varchar(20),              -- null = toutes les catégories
    created_at   timestamptz not null default now()
);
