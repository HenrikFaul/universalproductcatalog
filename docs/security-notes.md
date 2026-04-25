# Security notes

- Dynamic JSON updates are guarded by role checks (`catalog_admin` or `catalog_writer` for update only).
- Dynamic JSON payload is sanitized against prototype pollution keys.
- Pricing formulas are evaluated by a restricted parser (tokenizer + shunting-yard), no `eval()` usage.
- Soft-delete + effective dating model is enforced (`deleted_at`, `valid_from`, `valid_to`).
