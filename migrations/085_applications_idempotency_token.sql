alter table applications
add column if not exists idempotency_token text;

create unique index if not exists applications_idempotency_token_unique
on applications (idempotency_token)
where idempotency_token is not null;
