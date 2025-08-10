import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getCorpus } from "../src/corpus.ts";

// Import the CSV parser function for testing
import { parseCSVLine } from "../src/corpus.ts";

Deno.test("parseCSVLine handles basic CSV parsing", () => {
  const line = "text,label,score";
  const result = parseCSVLine(line);
  assertEquals(result, ["text", "label", "score"]);
});

Deno.test("parseCSVLine handles quoted fields", () => {
  const line = '"Hello, world",label,123';
  const result = parseCSVLine(line);
  assertEquals(result, ["Hello, world", "label", "123"]);
});

Deno.test("parseCSVLine handles escaped quotes", () => {
  const line = '"He said ""Hello""",label,456';
  const result = parseCSVLine(line);
  assertEquals(result, ['He said "Hello"', "label", "456"]);
});

Deno.test("parseCSVLine handles empty fields", () => {
  const line = "text,,score";
  const result = parseCSVLine(line);
  assertEquals(result, ["text", "", "score"]);
});

Deno.test("getCorpus returns default corpus when no dataset specified", async () => {
  // Clear any existing dataset environment variable
  const originalDataset = Deno.env.get("WR_HF_DATASET");
  const originalColumn = Deno.env.get("WR_HF_COLUMN");

  try {
    Deno.env.delete("WR_HF_DATASET");
    Deno.env.delete("WR_HF_COLUMN");

    const corpus = await getCorpus();
    assertExists(corpus);
    assertEquals(Array.isArray(corpus), true);
    assertEquals(corpus.length > 0, true);

    // Check that it contains the expected default content
    const sampleText = corpus[0];
    assertEquals(typeof sampleText, "string");
    assertEquals(sampleText.length > 0, true);
  } finally {
    // Restore original environment variables
    if (originalDataset) Deno.env.set("WR_HF_DATASET", originalDataset);
    if (originalColumn) Deno.env.set("WR_HF_COLUMN", originalColumn);
  }
});

Deno.test("getCorpus requires column specification for direct file loading", async () => {
  const originalDataset = Deno.env.get("WR_HF_DATASET");
  const originalColumn = Deno.env.get("WR_HF_COLUMN");

  try {
    // Set a test dataset without specifying column
    Deno.env.set("WR_HF_DATASET", "test-dataset");
    Deno.env.delete("WR_HF_COLUMN");

    const corpus = await getCorpus();
    // Should fall back to default corpus if column is not specified
    assertExists(corpus);
    assertEquals(Array.isArray(corpus), true);
    assertEquals(corpus.length > 0, true);
  } finally {
    // Restore original environment variables
    if (originalDataset) Deno.env.set("WR_HF_DATASET", originalDataset);
    if (originalColumn) Deno.env.set("WR_HF_COLUMN", originalColumn);
  }
});

Deno.test("getCorpus handles non-URL datasets gracefully", async () => {
  const originalDataset = Deno.env.get("WR_HF_DATASET");
  const originalColumn = Deno.env.get("WR_HF_COLUMN");

  try {
    // Set a non-URL dataset
    Deno.env.set("WR_HF_DATASET", "not-a-url");
    Deno.env.set("WR_HF_COLUMN", "text");

    const corpus = await getCorpus();
    // Should fall back to default corpus for non-URL datasets
    assertExists(corpus);
    assertEquals(Array.isArray(corpus), true);
    assertEquals(corpus.length > 0, true);
  } finally {
    // Restore original environment variables
    if (originalDataset) Deno.env.set("WR_HF_DATASET", originalDataset);
    if (originalColumn) Deno.env.set("WR_HF_COLUMN", originalColumn);
  }
});
