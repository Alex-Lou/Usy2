-- Widgets shared by the couple in the side menu: one common list that both
-- can edit (profile widgets stay personal). `widgets_version` goes up on every
-- change, so an edit made on an older copy is refused instead of overwriting.

alter table couple_settings
    add column widgets_json    jsonb   not null default '[]'::jsonb,
    add column widgets_version integer not null default 0;

insert into couple_settings (id) values (1) on conflict (id) do nothing;

-- Start from the widgets each person already showed in the side menu
-- ("home": true on their profile), in the same order, without that flag.
update couple_settings
set widgets_json = coalesce((
        select jsonb_agg(x.value - 'home' order by x.user_id, x.ord)
        from (
            select p.user_id, w.value, w.ord,
                   row_number() over (order by p.user_id, w.ord) as n
            from profile p
            cross join lateral jsonb_array_elements(
                    case when jsonb_typeof(p.widgets_json) = 'array' then p.widgets_json else '[]'::jsonb end
                 ) with ordinality as w(value, ord)
            where w.value ->> 'home' = 'true'
        ) x
        where x.n <= 20
    ), '[]'::jsonb)
where id = 1;
