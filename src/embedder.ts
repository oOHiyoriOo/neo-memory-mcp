import os from "os";
import path from "path";

// fastembed is imported dynamically so a missing native ARM64 binary
// (@anush008/tokenizers-linux-arm64-gnu) only causes a graceful fallback
// instead of crashing the whole process at module load time.
type FlagEmbeddingType = import("fastembed").FlagEmbedding;

let embedder: FlagEmbeddingType | null = null;
let embedderUnavailable = false;

const CACHE_DIR = path.join(os.homedir(), ".cache", "fastembed");

/**
 * Lazily initialises the local ONNX embedding model.
 * Downloads ~33 MB on first run, then cached to ~/.cache/fastembed.
 * Returns null on failure so callers fall back to full-text search gracefully.
 */
export async function getEmbedder(): Promise<FlagEmbeddingType | null> {
  if (embedder) return embedder;
  if (embedderUnavailable) return null;
  try {
    const { FlagEmbedding, EmbeddingModel } = await import("fastembed");
    embedder = await FlagEmbedding.init({ model: EmbeddingModel.BGESmallENV15, cacheDir: CACHE_DIR });
    return embedder;
  } catch (err) {
    embedderUnavailable = true;
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
