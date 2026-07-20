import { sql } from "~/db";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Reads src/db/schema.sql and executes each statement against the database.
 * Called by `bun run db:setup`.
 *
 * DATABASE_URL must be set in the environment (connected via the database card).
 * The script is safe to run multiple times — all statements use IF NOT EXISTS.
 */
export async function migrate(): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const schemaPath = join(__dirname, "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  // Split into individual statements, stripping comment lines
  const statements = schema
    .split(";")
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter((s) => s.length > 0);

  const db = sql();

  console.log(`Running ${statements.length} migration statements...`);

  for (const stmt of statements) {
    // Extract the first line as a human-readable label
    const label = stmt.split("\n")[0].replace(/^--\s*/, "").trim() || stmt.slice(0, 60);
    console.log(`  → ${label}`);
    await db.query(stmt + ";");
  }

  console.log("Migration complete.");
}

// Run directly when this file is executed as a script
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("migrate.ts") ||
    process.argv[1].endsWith("migrate.js"));

if (isMain) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
