import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateCorpusMarkovAnswer } from "../src/markov.ts";

Deno.test("Markov generation - basic functionality", () => {
  const result = generateCorpusMarkovAnswer("Once upon a time", 10);
  
  assertExists(result.text);
  assert(typeof result.text === "string");
  assert(typeof result.hitMaxLength === "boolean");
  assert(result.text.length > 0);
});

Deno.test("Markov generation - max tokens respected", () => {
  const maxTokens = 5;
  const result = generateCorpusMarkovAnswer("The quick brown fox", maxTokens);
  
  const tokens = result.text.trim().split(/\s+/);
  assert(tokens.length <= maxTokens, `Generated ${tokens.length} tokens, expected <= ${maxTokens}`);
  
  if (tokens.length === maxTokens) {
    assertEquals(result.hitMaxLength, true, "Should indicate max length was hit");
  }
});

Deno.test("Markov generation - doesn't repeat first word from prompt", () => {
  const prompt = "One upon a time";
  const result = generateCorpusMarkovAnswer(prompt, 10);
  
  // The generated text should not start with "One" (the first word of the prompt)
  const firstGeneratedWord = result.text.trim().split(/\s+/)[0]?.toLowerCase();
  assert(firstGeneratedWord !== "one", 
    `Generated text "${result.text}" should not start with "one" from prompt "${prompt}"`);
});

Deno.test("Markov generation - various max token sizes", () => {
  const testCases = [1, 3, 5, 10, 20, 50];
  
  for (const maxTokens of testCases) {
    const result = generateCorpusMarkovAnswer("Test prompt", maxTokens);
    const tokens = result.text.trim().split(/\s+/);
    
    assert(tokens.length <= maxTokens, 
      `With maxTokens=${maxTokens}, got ${tokens.length} tokens: "${result.text}"`);
    
    // Note: hitMaxLength=true means we reached the limit, but actual tokens might be less
    // due to early termination (punctuation, no valid next tokens, etc.)
    if (result.hitMaxLength) {
      assert(tokens.length > 0, "Should generate at least one token when hitMaxLength=true");
    }
  }
});

Deno.test("Markov generation - empty/invalid prompts", () => {
  // Empty prompt
  const emptyResult = generateCorpusMarkovAnswer("", 10);
  assertExists(emptyResult.text);
  
  // Single character
  const singleCharResult = generateCorpusMarkovAnswer("a", 10);
  assertExists(singleCharResult.text);
  
  // Non-existent words
  const nonsenseResult = generateCorpusMarkovAnswer("xyzabc123", 10);
  assertExists(nonsenseResult.text);
});

Deno.test("Markov generation - null/undefined max tokens", () => {
  const prompt = "Test with default limits";
  
  // null max tokens should use default (40)
  const nullResult = generateCorpusMarkovAnswer(prompt, null);
  assertExists(nullResult.text);
  const nullTokens = nullResult.text.trim().split(/\s+/);
  assert(nullTokens.length <= 40, "Should use default limit of 40 tokens");
  
  // undefined max tokens should use default (40)
  const undefinedResult = generateCorpusMarkovAnswer(prompt, undefined);
  assertExists(undefinedResult.text);
  const undefinedTokens = undefinedResult.text.trim().split(/\s+/);
  assert(undefinedTokens.length <= 40, "Should use default limit of 40 tokens");
});

Deno.test("Markov generation - zero/negative max tokens", () => {
  const prompt = "Test edge cases";
  
  // Zero max tokens should use default
  const zeroResult = generateCorpusMarkovAnswer(prompt, 0);
  assertExists(zeroResult.text);
  const zeroTokens = zeroResult.text.trim().split(/\s+/);
  assert(zeroTokens.length <= 40, "Zero maxTokens should use default limit");
  
  // Negative max tokens should use default
  const negativeResult = generateCorpusMarkovAnswer(prompt, -5);
  assertExists(negativeResult.text);
  const negativeTokens = negativeResult.text.trim().split(/\s+/);
  assert(negativeTokens.length <= 40, "Negative maxTokens should use default limit");
});

Deno.test("Markov generation - consistent token counting", () => {
  const prompt = "The weather is beautiful today";
  const maxTokens = 8;
  
  // Run multiple times to ensure consistency
  for (let i = 0; i < 10; i++) {
    const result = generateCorpusMarkovAnswer(prompt, maxTokens);
    const tokens = result.text.trim().split(/\s+/);
    
    assert(tokens.length <= maxTokens, 
      `Run ${i + 1}: Generated ${tokens.length} tokens, expected <= ${maxTokens}. Text: "${result.text}"`);
  }
});

Deno.test("Markov generation - text formatting", () => {
  const result = generateCorpusMarkovAnswer("Test formatting", 15);
  
  // Should start with lowercase
  assert(result.text[0] === result.text[0].toLowerCase(), 
    "First character should be lowercase");
  
  // Should not have excessive whitespace
  assert(!result.text.includes("  "), "Should not contain double spaces");
  assert(!result.text.startsWith(" "), "Should not start with space");
  assert(!result.text.endsWith(" "), "Should not end with space");
});

Deno.test("Markov generation - prompt word continuation", () => {
  // Test with different prompt endings to ensure proper continuation
  const prompts = [
    "The cat",
    "She walked",
    "In the garden",
    "During the storm",
  ];
  
  for (const prompt of prompts) {
    const result = generateCorpusMarkovAnswer(prompt, 10);
    const promptTokens = prompt.toLowerCase().split(/\s+/);
    const resultTokens = result.text.toLowerCase().split(/\s+/);
    
    // The first generated token should not be the last token from the prompt
    const lastPromptToken = promptTokens[promptTokens.length - 1];
    const firstResultToken = resultTokens[0];
    
    assert(firstResultToken !== lastPromptToken, 
      `For prompt "${prompt}", generated text "${result.text}" should not start with "${lastPromptToken}"`);
  }
});

Deno.test("Markov generation - 95% max tokens requirement", () => {
  const testCases = [
    { prompt: "Science and technology", maxTokens: 30 },
    { prompt: "Philosophy explores the nature", maxTokens: 25 },
    { prompt: "Art and culture throughout history", maxTokens: 35 },
  ];
  
  for (const { prompt, maxTokens } of testCases) {
    const result = generateCorpusMarkovAnswer(prompt, maxTokens);
    const tokens = result.text.trim().split(/\s+/);
    
    assert(tokens.length <= maxTokens, 
      `Generated ${tokens.length} tokens, expected <= ${maxTokens}`);
    
    // With aggressive fallback, should generate at least 95% of max_tokens
    assert(tokens.length >= maxTokens * 0.95, 
      `Prompt "${prompt}": Should generate at least 95% of max_tokens. Got ${tokens.length}/${maxTokens} (${Math.round(tokens.length/maxTokens*100)}%)`);
    
    // Should hit the length limit due to aggressive fallback
    assertEquals(result.hitMaxLength, true, 
      `Prompt "${prompt}": Should hit max length with aggressive fallback`);
  }
});
