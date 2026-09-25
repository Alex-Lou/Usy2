-- Shared "Nous" space: when the couple got together, one live mood per person,
-- short notes to each other, and shared named lists.

create table couple_settings (
    id             smallint primary key check (id = 1),
    together_since date
);

create table mood (
    user_id    bigint primary key references app_user (id) on delete cascade,
    emoji      varchar(16) not null,
    label      varchar(40),
    updated_at timestamptz not null default now()
);

-- The mood becomes a single live value: start from the first mood widget each
-- person already had on their profile.
insert into mood (user_id, emoji, label, updated_at)
select distinct on (p.user_id)
       p.user_id,
       left(btrim(w.value ->> 'emoji'), 16),
       nullif(left(btrim(coalesce(w.value ->> 'label', '')), 40), ''),
       p.updated_at
from profile p
cross join lateral jsonb_array_elements(
        case when jsonb_typeof(p.widgets_json) = 'array' then p.widgets_json else '[]'::jsonb end
     ) with ordinality as w(value, ord)
where w.value ->> 'type' = 'mood'
  and coalesce(btrim(w.value ->> 'emoji'), '') <> ''
order by p.user_id, w.ord;

create table couple_note (
    id         bigint generated always as identity primary key,
    author_id  bigint       not null references app_user (id),
    text       varchar(280) not null,
    created_at timestamptz  not null default now()
);
create index idx_couple_note_author on couple_note (author_id, created_at desc);
create index idx_couple_note_created_at on couple_note (created_at desc);

create table shared_list (
    id            bigint generated always as identity primary key,
    name          varchar(40) not null,
    created_by_id bigint      not null references app_user (id),
    created_at    timestamptz not null default now()
);

create table shared_list_item (
    id            bigint generated always as identity primary key,
    list_id       bigint       not null references shared_list (id) on delete cascade,
    text          varchar(120) not null,
    done          boolean      not null default false,
    created_by_id bigint       not null references app_user (id),
    created_at    timestamptz  not null default now()
);
create index idx_shared_list_item_list on shared_list_item (list_id, created_at);
