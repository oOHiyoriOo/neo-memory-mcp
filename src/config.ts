/** Central config — read once from environment. */
export const config = {
  neo4j: {
    uri:      process.env.NEO4J_URI      ?? "bolt://localhost:7687",
    user:     process.env.NEO4J_USER     ?? "neo4j",
    password: process.env.NEO4J_PASSWORD ?? "password",
  },
} as const;
