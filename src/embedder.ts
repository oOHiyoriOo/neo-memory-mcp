import { FlagEmbedding, EmbeddingModel } from "fastembed";
import os from "os";
import path from "path";

let embedder: FlagEmbedding | null = null;

const CACHE_DIR = path.join(os.homedir(), ".cache", "fastembed");

/**
 * Lazily initialises the local ONNX embedding model.
 * Downloads ~33 MB on first run, then cached to ~/.cache/fastembed.
 * Returns null on failure so callers fall back to full-text search gracefully.
 */
export async function getEmbedder(): Promise<FlagEmbedding | null> {
  if (embedder) return embedder;
  try {
    embedder = await FlagEmbedding.init({ model: EmbeddingModel.BGESmallENV15, cacheDir: CACHE_DIR });
    return embedder;
  } catch (err) {
    console.error("[neo-memory] embedder init failed — full-text fallback active", err);
    return null;
  }
}

/**
 * Embeds a single string into a float vector.
 * Returns null if the embedder is unavailable.
 */
export async function embed(text: string): Promise<number[] | null> {
  const e = await getEmbedder();
  if (!e) return null;
  try {
    const vec = await e.queryEmbed(text);
    return Array.from(vec);
  } catch {
    return null;
  }
}
