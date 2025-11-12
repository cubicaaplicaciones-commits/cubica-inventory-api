-- Usuarios y roles
create table if not exists roles (
  id bigserial primary key,
  name varchar(50) not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id bigserial primary key,
  email varchar(160) not null unique,
  password varchar(255) not null,
  full_name varchar(160),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists user_roles (
  user_id bigint not null references users(id) on delete cascade,
  role_id bigint not null references roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uk_user_roles unique (user_id, role_id)
);

-- Catalogo
create table if not exists items (
  id bigserial primary key,
  sku varchar(64) not null unique,
  name varchar(160) not null,
  description varchar(1000),
  unit varchar(16) not null,
  min_stock numeric(18,3) not null default 0,
  photo_url varchar(500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_items_sku on items(sku);
create index if not exists idx_items_name on items(name);

create table if not exists warehouses (
  id bigserial primary key,
  code varchar(32) not null unique,
  name varchar(160) not null,
  address varchar(300),
  city varchar(120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_wh_code on warehouses(code);
create index if not exists idx_wh_name on warehouses(name);

-- Stock
create table if not exists stock_levels (
  id bigserial primary key,
  item_id bigint not null references items(id) on delete cascade,
  warehouse_id bigint not null references warehouses(id) on delete cascade,
  quantity numeric(18,3) not null default 0,
  reserved numeric(18,3) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uk_stock_item_wh unique (item_id, warehouse_id)
);
create index if not exists idx_stock_item on stock_levels(item_id);
create index if not exists idx_stock_warehouse on stock_levels(warehouse_id);

-- Movimientos
create table if not exists movements (
  id bigserial primary key,
  type varchar(16) not null check (type in ('IN','OUT','TRANSFER','ADJUST')),
  movement_date timestamptz not null default now(),
  origin_warehouse_id bigint references warehouses(id),
  destination_warehouse_id bigint references warehouses(id),
  project_id bigint,
  notes varchar(1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_mov_date on movements(movement_date);
create index if not exists idx_mov_type on movements(type);
create index if not exists idx_mov_origin on movements(origin_warehouse_id);
create index if not exists idx_mov_dest on movements(destination_warehouse_id);

create table if not exists movement_lines (
  id bigserial primary key,
  movement_id bigint not null references movements(id) on delete cascade,
  item_id bigint not null references items(id),
  quantity numeric(18,3) not null,
  unit_cost numeric(18,6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_mvl_movement on movement_lines(movement_id);
create index if not exists idx_mvl_item on movement_lines(item_id);
