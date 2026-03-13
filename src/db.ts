import kuzu, { QueryResult } from "kuzu";
import fs from "fs";
import path from "path";
import { config } from "./config.js";

// Ensure the parent directory exists — KuzuDB creates the db directory itself
fs.mkdirSync(path.dirname(config.kuzu.dbPath), { recursive: true });

const db = new kuzu.Database(config.kuzu.dbPath);
export const conn = new kuzu.Connection(db);

/**
 * Run a Cypher query with optional named parameters.
 * Uses prepare+execute for parameterised queries, plain query otherwise.
 * Always returns an array of row objects.
 */
export async function runQuery(
  cypher: string,
  params?: Record<string, any>
): Promise<Record<string, any>[]> {
  let result: QueryResult | QueryResult[];

  if (params && Object.keys(params).length > 0) {
    const prepared = await conn.prepare(cypher);
    result = await conn.execute(prepared, params);
  } else {
    result = await conn.query(cypher);
  }

  if (Array.isArray(result)) {
    const rows: Record<string, any>[] = [];
    for (const r of result) rows.push(...(await r.getAll()));
    return rows;
  }
  return (result as QueryResult).getAll();
}

/**
 * Creates schema, loads extensions, and builds indexes on startup.
 * Safe to re-run — uses IF NOT EXISTS and silently ignores duplicate index errors.
 */
export async function bootstrapSchema(): Promise<void> {
  // Extensions are pre-bundled in v0.11.3 — just load them
  await runQuery("LOAD fts");
  await runQuery("LOAD vector");

  // Node tables — PRIMARY KEY enforces uniqueness
  await runQuery(`
    CREATE NODE TABLE IF NOT EXISTS Memory(
      id         STRING PRIMARY KEY,
      content    STRING,
      type       STRING,
      scope      STRING,
      tags       STRING[],
      created_at STRING,
      embedding  FLOAT[384]
    )
  `);
  await runQuery(`CREATE NODE TABLE IF NOT EXISTS Project(name STRING PRIMARY KEY)`);

  // Relationship tables
  await runQuery(`CREATE REL TABLE IF NOT EXISTS PART_OF(FROM Memory TO Project)`);
  await runQuery(`
    CREATE REL TABLE IF NOT EXISTS RELATES_TO(
      FROM Memory TO Memory,
      relation   STRING,
      created_at STRING
    )
  `);

  // FTS index on content (KuzuDB FTS only supports STRING, not STRING[])
  try {
    await runQuery(`CALL CREATE_FTS_INDEX('Memory', 'memory_fts', ['content'])`);
  } catch {
    // Index already exists on subsequent startups — safe to ignore
  }

  // Vector index on embedding — cosine similarity, 384-dim BGE-small-en-v1.5
  try {
    await runQuery(`CALL CREATE_VECTOR_INDEX('Memory', 'memory_vec', 'embedding', metric := 'cosine')`);
  } catch {
    // Index already exists on subsequent startups — safe to ignore
  }
}
