-- Product codes no longer have to look like SN-123: any 1–30 characters of A–Z, 0–9,
-- hyphen, underscore or dot, starting with a letter or digit (matches src/lib/product-code.ts).

alter table products drop constraint if exists products_code_check;
alter table products
  add constraint products_code_check check (code ~ '^[A-Z0-9][A-Z0-9._-]{0,29}$');
