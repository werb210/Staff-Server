create table if not exists ai_knowledge_documents (
  id uuid primary key,
  filename text not null,
  category text not null check (category in ('product', 'lender', 'underwriting', 'process')),
  active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists ai_knowledge_chunks (
  id uuid primary key,
  document_id uuid not null references ai_knowledge_documents(id) on delete cascade,
  content text not null,
  embedding jsonb not null,
  created_at timestamp not null default now()
);

create table if not exists chat_sessions (
  id uuid primary key,
  user_type text not null check (user_type in ('client', 'guest', 'portal')),
  status text not null check (status in ('active', 'escalated', 'closed')),
  escalated_to uuid null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists chat_messages (
  id uuid primary key,
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'ai', 'staff')),
  message text not null,
  metadata jsonb null,
  created_at timestamp not null default now()
);

create table if not exists issue_reports (
  id uuid primary key,
  session_id uuid null references chat_sessions(id) on delete set null,
  description text not null,
  page_url text not null,
  browser_info text not null,
  screenshot_path text null,
  status text not null check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamp not null default now()
);

create table if not exists ai_prequal_sessions (
  id uuid primary key,
  session_id uuid not null references chat_sessions(id) on delete cascade,
  revenue numeric null,
  industry text null,
  time_in_business integer null,
  province text null,
  requested_amount numeric null,
  lender_matches jsonb not null default '[]'::jsonb,
  created_at timestamp not null default now()
);

create index if not exists idx_ai_chunks_document_id on ai_knowledge_chunks(document_id);
create index if not exists idx_chat_messages_session_id on chat_messages(session_id);
create index if not exists idx_issue_reports_status on issue_reports(status);
create index if not exists idx_ai_prequal_session_id on ai_prequal_sessions(session_id);
