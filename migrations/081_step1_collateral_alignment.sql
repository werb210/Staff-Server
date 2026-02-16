alter table if exists readiness_sessions alter column years_in_business type text using years_in_business::text;
alter table if exists readiness_sessions alter column monthly_revenue type text using monthly_revenue::text;
alter table if exists readiness_sessions alter column annual_revenue type text using annual_revenue::text;

alter table if exists readiness_leads alter column years_in_business type text using years_in_business::text;
alter table if exists readiness_leads alter column monthly_revenue type text using monthly_revenue::text;
alter table if exists readiness_leads alter column annual_revenue type text using annual_revenue::text;

alter table if exists continuation alter column years_in_business type text using years_in_business::text;
alter table if exists continuation alter column monthly_revenue type text using monthly_revenue::text;
alter table if exists continuation alter column annual_revenue type text using annual_revenue::text;

alter table if exists crm_leads add column if not exists ar_balance text;
alter table if exists crm_leads add column if not exists collateral_available text;
update crm_leads
set ar_balance = coalesce(ar_balance, ar_outstanding),
    collateral_available = coalesce(collateral_available, existing_debt)
where ar_balance is null or collateral_available is null;
alter table if exists crm_leads drop column if exists ar_outstanding;
alter table if exists crm_leads drop column if exists existing_debt;

alter table if exists readiness_sessions add column if not exists ar_balance text;
alter table if exists readiness_sessions add column if not exists collateral_available text;
update readiness_sessions
set ar_balance = coalesce(ar_balance, ar_outstanding::text),
    collateral_available = coalesce(collateral_available, existing_debt::text)
where ar_balance is null or collateral_available is null;
alter table if exists readiness_sessions drop column if exists ar_outstanding;
alter table if exists readiness_sessions drop column if exists existing_debt;

alter table if exists readiness_leads add column if not exists ar_balance text;
alter table if exists readiness_leads add column if not exists collateral_available text;
update readiness_leads
set ar_balance = coalesce(ar_balance, ar_outstanding::text),
    collateral_available = coalesce(collateral_available, existing_debt::text)
where ar_balance is null or collateral_available is null;
alter table if exists readiness_leads drop column if exists ar_outstanding;
alter table if exists readiness_leads drop column if exists existing_debt;

alter table if exists continuation add column if not exists ar_balance text;
alter table if exists continuation add column if not exists collateral_available text;
update continuation
set ar_balance = coalesce(ar_balance, ar_outstanding::text),
    collateral_available = coalesce(collateral_available, existing_debt::text)
where ar_balance is null or collateral_available is null;
alter table if exists continuation drop column if exists ar_outstanding;
alter table if exists continuation drop column if exists existing_debt;
