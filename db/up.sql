create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create table accounts (
  id         text      not null default uuid_generate_v4()::text primary key,
  pub_key    text      not null unique,
  username   text      not null unique,
  nonce      text      not null default uuid_generate_v4()::text
);

create table sessions (
  id           text      not null default uuid_generate_v4()::text primary key,
  account_id   text      not null references accounts(id),
  created_at   timestamp not null default current_timestamp,
  valid_until  timestamp not null default current_timestamp + '24h'::interval,
  contents     jsonb     not null default '{}'
);
