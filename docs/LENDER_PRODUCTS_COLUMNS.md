# Lender Products Database Schema

## Canonical PostgreSQL Column Definition

Based on database introspection on July 2, 2025:

| Column Name | Data Type | Nullable | Default |
|-------------|-----------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| tenant_id | uuid | NO | (none) |
| product_name | character varying | NO | (none) |
| lender_name | character varying | NO | (none) |
| product_type | USER-DEFINED | NO | (none) |
| geography | ARRAY | NO | (none) |
| min_amount | numeric | NO | (none) |
| max_amount | numeric | NO | (none) |
| min_revenue | numeric | YES | (none) |
| industries | ARRAY | YES | (none) |
| description | text | YES | (none) |
| video_url | character varying | YES | (none) |
| is_active | boolean | YES | true |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| name | character varying | NO | (none) |
| country | character varying | NO | (none) |
| category | character varying | NO | (none) |
| doc_requirements | ARRAY | YES | '{}'::character varying[] |

## Schema Notes

- **Total Columns**: 19
- **Required Fields**: 8 (id, tenant_id, product_name, lender_name, product_type, geography, min_amount, max_amount, name, country, category)
- **Optional Fields**: 11
- **Enum Fields**: product_type (USER-DEFINED enum)
- **Array Fields**: geography, industries, doc_requirements
- **Auto-Generated**: id (UUID), created_at, updated_at
- **Business Logic**: category and country have strict validation constraints

## Current Validation Status

✅ **Strict Schema Fields**: name, country, category (added with constraints)  
✅ **Legacy Fields**: All original fields maintained for backwards compatibility  
✅ **Data Migration**: All 43 products successfully migrated to strict schema  
⚠️ **Schema Alignment**: Need to create canonical TypeScript interface matching all 19 fields

---

**Documentation Date**: July 2, 2025  
**Source**: PostgreSQL information_schema.columns introspection  
**Status**: Production database schema