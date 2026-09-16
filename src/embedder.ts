import os from "os";
import path from "path";

// The ML runtime is imported dynamically so missing native binaries only
// activate the existing full-text fallback.
type EmbedderType = import("@huggingface/transformers").FeatureExtractionPipeline;

let embedder: EmbedderType | null = null;
let embedderUnavailable = false;

const CACHE_DIR = path.join(os.homedir(), ".cache", "transformers");

/**
 * Lazily initialises the local ONNX embedding model.
 * Downloads the model on first run, then caches it to ~/.cache/transformers.
 * Returns null on failure so callers fall back to full-text search gracefully.
 */
export async function getEmbedder(): Promise<EmbedderType | null> {
  if (embedder) return embedder;
  if (embedderUnavailable) return null;
  try {
    const { env, pipeline } = await import("@huggingface/transformers");
    env.cacheDir = CACHE_DIR;
    embedder = await pipeline("feature-extraction", "Xenova/bge-small-en-v1.5");
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
    const vec = await e(text, { pooling: "mean", normalize: true });
    return Array.from(vec.data);
  } catch {
    return null;
  }
}
