-- Web Push (RFC 8030/8291/8292).
-- The server's VAPID key pair is generated on first use and kept here so every
-- restart signs with the same identity (browsers bind subscriptions to it).
-- Single row, enforced by the check.
create table vapid_key (
    id          smallint    primary key check (id = 1),
    public_key  varchar(100) not null,
    private_key text        not null,
    created_at  timestamptz not null default now()
);

-- One row per browser/device that accepted notifications. The endpoint is the
-- push service URL handed out by the browser (unique per device).
create table push_subscription (
    id         bigint generated always as identity primary key,
    user_id    bigint        not null references app_user (id) on delete cascade,
    endpoint   varchar(1024) not null unique,
    p256dh     varchar(200)  not null,
    auth       varchar(100)  not null,
    created_at timestamptz   not null default now()
);

create index idx_push_subscription_user on push_subscription (user_id);
