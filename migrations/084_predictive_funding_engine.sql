alter table if exists applications
  add column if not exists funding_probability numeric,
  add column if not exists expected_commission numeric,
  add column if not exists priority_tier text;
