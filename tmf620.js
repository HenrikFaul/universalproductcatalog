-- EPC core schema with EAV + JSONB, pricing, rules, lifecycle/effective dating
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS epc_product_specification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_specification_id UUID REFERENCES epc_product_specification(id),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  version_major INTEGER NOT NULL DEFAULT 1,
  version_minor INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE TABLE IF NOT EXISTS epc_resource_specification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  dynamic_attributes JSONB NOT NULL DEFAULT '{}'::JSONB,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS epc_service_specification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  dynamic_attributes JSONB NOT NULL DEFAULT '{}'::JSONB,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS epc_product_offering (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  specification_id UUID NOT NULL REFERENCES epc_product_specification(id),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  dynamic_attributes JSONB NOT NULL DEFAULT '{}'::JSONB,
  version_major INTEGER NOT NULL DEFAULT 1,
  version_minor INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (jsonb_typeof(dynamic_attributes) = 'object'),
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE TABLE IF NOT EXISTS epc_attribute_definition (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  specification_id UUID NOT NULL REFERENCES epc_product_specification(id),
  attribute_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('STRING', 'NUMBER', 'BOOLEAN', 'ENUM')),
  ui_component TEXT NOT NULL CHECK (ui_component IN ('select', 'radio', 'text', 'number', 'checkbox')),
  ui_group TEXT NOT NULL,
  configurable BOOLEAN NOT NULL DEFAULT TRUE,
  options JSONB NOT NULL DEFAULT '[]'::JSONB,
  validation JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  rule_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  CHECK (jsonb_typeof(options) = 'array')
);

CREATE TABLE IF NOT EXISTS epc_bom_component (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_specification_id UUID NOT NULL REFERENCES epc_product_specification(id),
  child_specification_id UUID NOT NULL REFERENCES epc_product_specification(id),
  min_cardinality INTEGER NOT NULL DEFAULT 0,
  max_cardinality INTEGER,
  default_quantity INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  CHECK (min_cardinality >= 0),
  CHECK (max_cardinality IS NULL OR max_cardinality >= min_cardinality),
  CHECK (default_quantity >= min_cardinality)
);

CREATE TABLE IF NOT EXISTS epc_charge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offering_id UUID NOT NULL REFERENCES epc_product_offering(id),
  charge_type TEXT NOT NULL CHECK (charge_type IN ('ONETIME', 'RECURRING', 'USAGE')),
  calculation_method TEXT NOT NULL DEFAULT 'FLAT_FEE' CHECK (calculation_method IN ('FLAT_FEE', 'PER_UNIT', 'TIERED', 'ATTRIBUTE_BASED')),
  currency TEXT NOT NULL,
  base_price NUMERIC(18,4) NOT NULL,
  tiers JSONB NOT NULL DEFAULT '[]'::JSONB,
  abp_formula TEXT,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE TABLE IF NOT EXISTS epc_price_book (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  decision_score INTEGER NOT NULL DEFAULT 0,
  context_filter JSONB NOT NULL DEFAULT '{}'::JSONB,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS epc_price_override (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_book_id UUID NOT NULL REFERENCES epc_price_book(id),
  charge_id UUID NOT NULL REFERENCES epc_charge(id),
  override_type TEXT NOT NULL CHECK (override_type IN ('ABSOLUTE', 'DELTA', 'PERCENT')),
  override_value NUMERIC(18,6) NOT NULL,
  waterfall_step INTEGER NOT NULL,
  condition_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS epc_rule_definition (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_offering_id UUID NOT NULL REFERENCES epc_product_offering(id),
  target_offering_id UUID NOT NULL REFERENCES epc_product_offering(id),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('ELIGIBILITY', 'REQUIRES', 'EXCLUDES', 'CONSTRAINS')),
  event_scope TEXT NOT NULL CHECK (event_scope IN ('ON_LOAD', 'ON_CHANGE', 'ON_SUBMIT')),
  condition_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_offering_dynamic_attr ON epc_product_offering USING GIN(dynamic_attributes);
CREATE INDEX IF NOT EXISTS idx_spec_effective_gist ON epc_product_specification USING GIST (tstzrange(valid_from, COALESCE(valid_to, 'infinity'::timestamptz)));
CREATE INDEX IF NOT EXISTS idx_offering_effective_gist ON epc_product_offering USING GIST (tstzrange(valid_from, COALESCE(valid_to, 'infinity'::timestamptz)));
CREATE INDEX IF NOT EXISTS idx_attribute_validation_gin ON epc_attribute_definition USING GIN(validation);
