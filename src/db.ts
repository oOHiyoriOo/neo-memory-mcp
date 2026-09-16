import neo4j, { Driver, Session } from "neo4j-driver";
import { config } from "./config.js";

export const driver: Driver = neo4j.driver(
  config.neo4j.uri,
  neo4j.auth.basic(config.neo4j.user, config.neo4j.password)
);

/**
 * Creates Neo4j constraints and indexes on startup.
 * Uses IF NOT EXISTS so it is idempotent and safe to re-run.
 */
export async function bootstrapSchema(session: Session): Promise<void> {
  await session.run(
    "CREATE CONSTRAINT memory_id IF NOT EXISTS FOR (m:Memory) REQUIRE m.id IS UNIQUE"
  );
  await session.run(
    "CREATE CONSTRAINT project_name IF NOT EXISTS FOR (p:Project) REQUIRE p.name IS UNIQUE"
  );
  // Full-text index — used as recall fallback when embedder is unavailable
  await session.run(`
    CREATE FULLTEXT INDEX memory_fulltext IF NOT EXISTS
    FOR (m:Memory) ON EACH [m.content, m.tags]
  `);
  // Vector index — 384 dimensions matches BGE-small-en-v1.5
  await session.run(`
    CREATE VECTOR INDEX memory_vector IF NOT EXISTS
    FOR (m:Memory) ON (m.embedding)
    OPTIONS { indexConfig: {
      \`vector.dimensions\`: 384,
      \`vector.similarity_function\`: 'cosine'
    }}
  `);
}
