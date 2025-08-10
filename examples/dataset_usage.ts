#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * Example script demonstrating how to use the direct file dataset loading
 *
 * This script shows how to:
 * 1. Load the default corpus
 * 2. Load a custom dataset using a direct file URL
 * 3. Use environment variables for configuration
 */

import { getCorpus } from "../src/corpus.ts";

async function main() {
  console.log("🤖 White Rabbit Dataset Usage Example\n");

  // Check if custom dataset is configured
  const datasetUrl = Deno.env.get("WR_HF_DATASET");
  const targetColumn = Deno.env.get("WR_HF_COLUMN");

  if (datasetUrl && targetColumn) {
    console.log("📊 Custom dataset configuration detected:");
    console.log(`   Dataset URL: ${datasetUrl}`);
    console.log(`   Column: ${targetColumn}`);
    console.log();

    console.log("🔄 Loading custom dataset...");
    const customCorpus = await getCorpus();
    console.log(`✅ Loaded ${customCorpus.length} texts from custom dataset`);
    console.log();

    // Show some sample texts
    console.log("📝 Sample texts from custom dataset:");
    for (let i = 0; i < Math.min(3, customCorpus.length); i++) {
      const text = customCorpus[i];
      const preview = text.length > 100 ? text.substring(0, 100) + "..." : text;
      console.log(`   ${i + 1}. ${preview}`);
    }
  } else {
    console.log("📊 No custom dataset configured, using default corpus");
    console.log();
    console.log("To use a custom dataset, set these environment variables:");
    console.log(
      "   export WR_HF_DATASET='https://huggingface.co/datasets/toxigen/toxigen-data/resolve/main/toxigen.csv'",
    );
    console.log("   export WR_HF_COLUMN='text'");
    console.log();

    console.log("🔄 Loading default corpus...");
    const defaultCorpus = await getCorpus();
    console.log(`✅ Loaded ${defaultCorpus.length} texts from default corpus`);
    console.log();

    // Show some sample texts
    console.log("📝 Sample texts from default corpus:");
    for (let i = 0; i < Math.min(3, defaultCorpus.length); i++) {
      const text = defaultCorpus[i];
      const preview = text.length > 100 ? text.substring(0, 100) + "..." : text;
      console.log(`   ${i + 1}. ${preview}`);
    }
  }

  console.log();
  console.log("🎯 Usage examples:");
  console.log();
  console.log("1. Using direct file URL (Recommended):");
  console.log(
    "   export WR_HF_DATASET='https://huggingface.co/datasets/toxigen/toxigen-data/resolve/main/toxigen.csv'",
  );
  console.log("   export WR_HF_COLUMN='text'");
  console.log("   deno run --allow-env --allow-net examples/dataset_usage.ts");
  console.log();
  console.log("2. Start the server with custom dataset:");
  console.log(
    "   export WR_HF_DATASET='https://huggingface.co/datasets/toxigen/toxigen-data/resolve/main/toxigen.csv'",
  );
  console.log("   export WR_HF_COLUMN='text'");
  console.log("   deno task start");
  console.log();
  console.log(
    "💡 Note: Use /resolve/ instead of /blob/ in Hugging Face URLs to get raw file content",
  );
}

if (import.meta.main) {
  main().catch(console.error);
}
