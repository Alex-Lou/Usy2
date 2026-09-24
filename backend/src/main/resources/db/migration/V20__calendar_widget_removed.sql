-- The calendar and music are now spaces of their own (menu), not widgets:
-- drop any "calendar" / "music" widget already placed on a profile or in the
-- side menu. The shared list's version moves on so an open editor holding the
-- old copy gets a 409 instead of saving the removed widget back.

update profile p
set widgets_json = coalesce((
        select jsonb_agg(w.value order by w.ord)
        from jsonb_array_elements(p.widgets_json) with ordinality as w(value, ord)
        where coalesce(w.value ->> 'type', '') not in ('calendar', 'music')
    ), '[]'::jsonb)
where jsonb_typeof(p.widgets_json) = 'array'
  and exists (select 1 from jsonb_array_elements(p.widgets_json) w(value)
              where w.value ->> 'type' in ('calendar', 'music'));

update couple_settings s
set widgets_json = coalesce((
        select jsonb_agg(w.value order by w.ord)
        from jsonb_array_elements(s.widgets_json) with ordinality as w(value, ord)
        where coalesce(w.value ->> 'type', '') not in ('calendar', 'music')
    ), '[]'::jsonb),
    widgets_version = s.widgets_version + 1
where jsonb_typeof(s.widgets_json) = 'array'
  and exists (select 1 from jsonb_array_elements(s.widgets_json) w(value)
              where w.value ->> 'type' in ('calendar', 'music'));
