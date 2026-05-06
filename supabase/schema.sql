create extension if not exists pgcrypto;

create table if not exists public.app_settings (
  id integer primary key default 1,
  balance_tokens integer not null default 0,
  tea_cost integer not null default 10,
  coffee_cost integer not null default 10,
  packet_5_cost integer not null default 5,
  packet_10_cost integer not null default 10,
  packet_20_cost integer not null default 20,
  updated_at timestamptz default now()
);

insert into public.app_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.token_transactions (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('ADD_TOKENS', 'SPEND_TOKENS')),
  item text check (item in ('tea', 'coffee', 'packet_5', 'packet_10', 'packet_20', 'admin_add')),
  label text not null,
  tokens_change integer not null,
  balance_after integer not null,
  quantity integer not null default 1,
  note text,
  date_key text not null,
  month_key text not null,
  created_at timestamptz default now()
);

create or replace function public.add_tokens_rpc(amount integer, note_text text default null)
returns table(new_balance integer)
language plpgsql
security definer
as $$
declare
  current_balance integer;
  updated_balance integer;
  today_key text;
  this_month_key text;
begin
  if amount is null or amount <= 0 then
    raise exception 'Amount must be positive integer';
  end if;

  select balance_tokens into current_balance from public.app_settings where id = 1 for update;
  if current_balance is null then raise exception 'App settings row missing'; end if;

  updated_balance := current_balance + amount;
  update public.app_settings set balance_tokens = updated_balance, updated_at = now() where id = 1;

  today_key := to_char((now() at time zone 'Asia/Kolkata'), 'YYYY-MM-DD');
  this_month_key := to_char((now() at time zone 'Asia/Kolkata'), 'YYYY-MM');

  insert into public.token_transactions(action,item,label,tokens_change,balance_after,quantity,note,date_key,month_key)
  values ('ADD_TOKENS','admin_add','Admin Add Tokens',amount,updated_balance,1,note_text,today_key,this_month_key);

  return query select updated_balance;
end;
$$;

create or replace function public.spend_tokens_rpc(item_key text, qty integer default 1)
returns table(new_balance integer)
language plpgsql
security definer
as $$
declare
  current_balance integer;
  unit_cost integer;
  spend_cost integer;
  updated_balance integer;
  spend_label text;
  today_key text;
  this_month_key text;
begin
  if item_key not in ('tea', 'coffee', 'packet_5', 'packet_10', 'packet_20') then
    raise exception 'Invalid item';
  end if;
  if qty is null or qty <= 0 then
    raise exception 'Quantity must be positive integer';
  end if;

  select balance_tokens into current_balance from public.app_settings where id = 1 for update;
  if current_balance is null then raise exception 'App settings row missing'; end if;

  select case
    when item_key = 'tea' then tea_cost
    when item_key = 'coffee' then coffee_cost
    when item_key = 'packet_5' then packet_5_cost
    when item_key = 'packet_10' then packet_10_cost
    when item_key = 'packet_20' then packet_20_cost
  end into unit_cost from public.app_settings where id = 1;

  if unit_cost is null or unit_cost <= 0 then
    raise exception 'Invalid item cost';
  end if;

  spend_cost := unit_cost * qty;
  if current_balance < spend_cost then
    raise exception 'Not enough tokens';
  end if;

  updated_balance := current_balance - spend_cost;
  update public.app_settings set balance_tokens = updated_balance, updated_at = now() where id = 1;

  spend_label := case
    when item_key = 'tea' then 'Tea Token Spend'
    when item_key = 'coffee' then 'Coffee Token Spend'
    when item_key = 'packet_5' then 'Packet 5 Token Spend'
    when item_key = 'packet_10' then 'Packet 10 Token Spend'
    when item_key = 'packet_20' then 'Packet 20 Token Spend'
  end;

  today_key := to_char((now() at time zone 'Asia/Kolkata'), 'YYYY-MM-DD');
  this_month_key := to_char((now() at time zone 'Asia/Kolkata'), 'YYYY-MM');

  insert into public.token_transactions(action,item,label,tokens_change,balance_after,quantity,note,date_key,month_key)
  values ('SPEND_TOKENS',item_key,spend_label,-spend_cost,updated_balance,qty,null,today_key,this_month_key);

  return query select updated_balance;
end;
$$;
