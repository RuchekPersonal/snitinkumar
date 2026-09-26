// Applies supabase/migrations/*.sql in order, once each.
// Run: node --env-file=.env.local scripts/db/migrate.mjs
// Needs DATABASE_URL (Supabase → Project Settings → Database → Connection string → Session pooler).
import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local (Session pooler connection string).");
  process.exit(1);
}

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../supabase/migrations");
const sql = postgres(url, { ssl: "require", max: 1, onnotice: () => {} });

try {
  await sql`
    create table if not exists public.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`;
  await sql`alter table public.schema_migrations enable row level security`;
  await sql`revoke all on public.schema_migrations from anon, authenticated`;

  const applied = new Set((await sql`select name from public.schema_migrations`).map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`✓ ${file} (already applied)`);
      continue;
    }
    const body = await readFile(path.join(dir, file), "utf8");
    await sql.unsafe(body);
    await sql`insert into public.schema_migrations (name) values (${file})`;
    console.log(`✓ ${file} applied`);
  }
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
