create extension if not exists vector;

create table if not exists ai_knowledge (
  id uuid not null,
  source_type text not null,
  source_id text,
  content text not null,
  embedding vector(1536),
  created_at timestamp default now(),
  constraint ai_knowledge_pk primary key (id)
);

alter table if exists ai_knowledge
  add column if not exists source_id text,
  add column if not exists embedding vector(1536);
