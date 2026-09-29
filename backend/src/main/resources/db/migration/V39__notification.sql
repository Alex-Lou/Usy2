-- Historique des notifications (la cloche), partagé entre les appareils d'une personne.
-- text : la phrase (« Lou a commenté ton post 💬 ») ; excerpt : l'extrait éventuel ;
-- tag : une notif non lue de même tag est remplacée (ex. plusieurs messages d'affilée).
-- Seules les 100 dernières par personne sont gardées (NotificationService).
create table notification (
    id           bigint generated always as identity primary key,
    recipient_id bigint       not null references app_user (id) on delete cascade,
    text         varchar(300) not null,
    excerpt      varchar(300),
    url          varchar(300) not null,
    tag          varchar(100) not null,
    read         boolean      not null default false,
    created_at   timestamptz  not null default now()
);

create index idx_notification_recipient on notification (recipient_id, id desc);
