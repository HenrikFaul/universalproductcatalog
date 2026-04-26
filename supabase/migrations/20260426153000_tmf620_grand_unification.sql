CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE epc_product_type AS ENUM ('PHYSICAL', 'SERVICE', 'HYBRID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE epc_service_type AS ENUM ('CUSTOMER_FACING', 'RESOURCE_FACING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE epc_offering_status AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE epc_price_type AS ENUM ('RECURRING', 'ONE_TIME', 'USAGE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE epc_pricing_method AS ENUM ('FLAT', 'TIERED', 'ATTRIBUTE_BASED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE epc_relationship_type AS ENUM ('BUNDLE', 'UPSELL', 'CROSS_SELL', 'EXCLUDES', 'REQUIRES');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE epc_alteration_type AS ENUM ('DISCOUNT', 'SURCHARGE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE epc_spec_relationship_type AS ENUM ('DEPENDENCY', 'MIGRATION', 'SUBSTITUTION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE epc_resource_type AS ENUM ('LOGICAL', 'PHYSICAL', 'COMPOUND');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS epc_product (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  product_type epc_product_type NOT NULL DEFAULT 'SERVICE',
  lifecycle_status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE epc_product_specification
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES epc_product(id),
  ADD COLUMN IF NOT EXISTS product_number TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dynamic_attributes JSONB NOT NULL DEFAULT '{}'::JSONB;

DO $$ BEGIN
  ALTER TABLE epc_product_specification ADD CONSTRAINT uq_epc_product_spec_product_number UNIQUE (product_number);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS epc_service_specification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  service_type epc_service_type NOT NULL DEFAULT 'CUSTOMER_FACING',
  version TEXT NOT NULL DEFAULT '1.0.0',
  lifecycle_status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE epc_product_offering
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES epc_product(id),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status epc_offering_status NOT NULL DEFAULT 'DRAFT';

CREATE TABLE IF NOT EXISTS epc_product_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS epc_product_offering_price (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offering_id UUID NOT NULL REFERENCES epc_product_offering(id),
  name TEXT NOT NULL,
  price_type epc_price_type NOT NULL,
  pricing_method epc_pricing_method NOT NULL,
  amount NUMERIC(18,4) NOT NULL,
  currency TEXT NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS epc_product_offering_relationship (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_offering_id UUID NOT NULL REFERENCES epc_product_offering(id) ON DELETE CASCADE,
  target_offering_id UUID NOT NULL REFERENCES epc_product_offering(id) ON DELETE CASCADE,
  relationship_type epc_relationship_type NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epc_characteristic (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_specification_id UUID REFERENCES epc_product_specification(id) ON DELETE CASCADE,
  product_offering_id UUID REFERENCES epc_product_offering(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('String', 'Number', 'Boolean')),
  configurable BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_values JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epc_characteristic_value (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  characteristic_id UUID NOT NULL REFERENCES epc_characteristic(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  frozen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epc_catalog_category (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  catalog_id UUID REFERENCES epc_product_catalog(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES epc_catalog_category(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS epc_catalog_category_offering (
  category_id UUID NOT NULL REFERENCES epc_catalog_category(id) ON DELETE CASCADE,
  offering_id UUID NOT NULL REFERENCES epc_product_offering(id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, offering_id)
);

CREATE TABLE IF NOT EXISTS epc_product_offering_term (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offering_id UUID NOT NULL REFERENCES epc_product_offering(id) ON DELETE CASCADE,
  duration_months INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epc_price_alteration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_offering_price_id UUID NOT NULL REFERENCES epc_product_offering_price(id) ON DELETE CASCADE,
  alteration_type epc_alteration_type NOT NULL,
  percentage NUMERIC(9,4),
  fixed_amount NUMERIC(18,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epc_product_spec_relationship (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_spec_id UUID NOT NULL REFERENCES epc_product_specification(id) ON DELETE CASCADE,
  target_spec_id UUID NOT NULL REFERENCES epc_product_specification(id) ON DELETE CASCADE,
  relationship_type epc_spec_relationship_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epc_service_spec_product_spec (
  service_spec_id UUID NOT NULL REFERENCES epc_service_specification(id) ON DELETE CASCADE,
  product_spec_id UUID NOT NULL REFERENCES epc_product_specification(id) ON DELETE CASCADE,
  PRIMARY KEY (service_spec_id, product_spec_id)
);

CREATE TABLE IF NOT EXISTS epc_resource_specification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  resource_type epc_resource_type NOT NULL,
  vendor TEXT,
  model TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS epc_service_spec_resource_spec (
  service_spec_id UUID NOT NULL REFERENCES epc_service_specification(id) ON DELETE CASCADE,
  resource_spec_id UUID NOT NULL REFERENCES epc_resource_specification(id) ON DELETE CASCADE,
  PRIMARY KEY (service_spec_id, resource_spec_id)
);

CREATE INDEX IF NOT EXISTS idx_epc_product_spec_dynamic_attributes ON epc_product_specification USING GIN (dynamic_attributes);
CREATE INDEX IF NOT EXISTS idx_epc_characteristic_allowed_values ON epc_characteristic USING GIN (allowed_values);
