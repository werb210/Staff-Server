create extension if not exists vector;

create table if not exists ai_knowledge_documents (
  id uuid not null default gen_random_uuid(),
  title text not null,
  content text not null,
  embedding vector(1536),
  source_type text not null,
  created_at timestamp default now(),
  constraint ai_knowledge_documents_pk primary key (id)
);

create table if not exists ai_system_rules (
  id uuid not null default gen_random_uuid(),
  rule_key text unique not null,
  rule_value text not null,
  updated_at timestamp default now(),
  constraint ai_system_rules_pk primary key (id)
);
