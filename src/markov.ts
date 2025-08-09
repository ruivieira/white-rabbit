import { corpus } from "./corpus.ts";

type TransitionCounts = Map<string, Map<string, number>>;

function normaliseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\.,!\?\-']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Keep punctuation as separate tokens where possible
  const tokens: string[] = [];
  for (const part of cleaned.split(" ")) {
    const m = part.match(/([\p{L}\p{N}\-']+|[\.,!\?])/gu);
    if (m) tokens.push(...m);
  }
  return tokens;
}

// Removed stopwords/QA-weighted chain; corpus-only implementation remains below

function argMax<K>(map: Map<K, number>): K | null {
  let bestKey: K | null = null;
  let bestVal = -Infinity;
  for (const [k, v] of map.entries()) {
    if (v > bestVal) {
      bestVal = v;
      bestKey = k;
    }
  }
  return bestKey;
}

function weightedRandomChoice<T>(items: T[], weights: number[]): T | null {
  if (items.length === 0 || weights.length === 0) return null;
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return items[0];
  
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

function nextToken(current: string, transitions: TransitionCounts, recentTokens: Set<string>): string | null {
  const map = transitions.get(current);
  if (!map || map.size === 0) return null;
  
  // Get all possible next tokens and their counts
  const candidates: string[] = [];
  const weights: number[] = [];
  
  for (const [token, count] of map.entries()) {
    candidates.push(token);
    // Penalise recently used tokens to reduce repetition
    const penalty = recentTokens.has(token) ? 0.1 : 1.0;
    weights.push(count * penalty);
  }
  
  // Use weighted random selection instead of always picking the most probable
  return weightedRandomChoice(candidates, weights);
}

function isPunctuationToken(tok: string): boolean {
  return tok === "." || tok === "!" || tok === "?";
}

// Removed QA-weighted generator; corpus-only implementation below

// --- Global corpus Markov ---

function buildGlobalChain(sentences: string[]): {
  startCounts: Map<string, number>;
  transitions: TransitionCounts;
  tokenCounts: Map<string, number>;
} {
  const startCounts = new Map<string, number>();
  const transitions: TransitionCounts = new Map();
  const tokenCounts = new Map<string, number>();

  for (const sentence of sentences) {
    const tokens = tokenize(sentence);
    if (tokens.length === 0) continue;
    startCounts.set(tokens[0], (startCounts.get(tokens[0]) ?? 0) + 1);
    for (const t of tokens) tokenCounts.set(t, (tokenCounts.get(t) ?? 0) + 1);
    for (let i = 0; i < tokens.length - 1; i++) {
      const cur = tokens[i];
      const nxt = tokens[i + 1];
      let map = transitions.get(cur);
      if (!map) {
        map = new Map();
        transitions.set(cur, map);
      }
      map.set(nxt, (map.get(nxt) ?? 0) + 1);
    }
  }

  return { startCounts, transitions, tokenCounts };
}

const GLOBAL_CHAIN = buildGlobalChain(corpus);

export function generateCorpusMarkovAnswer(
  prompt: string,
  maxTokens: number | null | undefined,
): { text: string; hitMaxLength: boolean } {
  const { startCounts, transitions, tokenCounts } = GLOBAL_CHAIN;
  const limit = typeof maxTokens === "number" && maxTokens > 0 ? maxTokens : 40;

  const pTokens = tokenize(prompt);
  let current: string | null = null;
  for (let i = pTokens.length - 1; i >= 0; i--) {
    if (transitions.has(pTokens[i])) {
      current = pTokens[i];
      break;
    }
  }
  if (!current) current = argMax(startCounts);
  if (!current) current = argMax(tokenCounts);
  if (!current) return { text: "", hitMaxLength: false };

  const outTokens: string[] = [current];
  const recentTokens = new Set<string>();
  const RECENT_WINDOW = 5; // Track last 5 tokens to avoid repetition
  
  let hitMax = false;
  while (outTokens.length < limit) {
    const next = nextToken(current, transitions, recentTokens);
    if (!next) break;
    
    outTokens.push(next);
    
    // Update recent tokens window
    recentTokens.add(next);
    if (recentTokens.size > RECENT_WINDOW) {
      // Remove oldest token (simple approximation)
      const tokensArray = Array.from(recentTokens);
      recentTokens.delete(tokensArray[0]);
    }
    
    current = next;
    if (isPunctuationToken(next)) break;
  }
  if (outTokens.length >= limit) hitMax = true;

  let text = "";
  for (const tok of outTokens) {
    if (isPunctuationToken(tok)) {
      text = text.trimEnd() + tok + " ";
    } else {
      text += (text.endsWith(" ") || text.length === 0 ? "" : " ") + tok;
    }
  }
  text = normaliseWhitespace(text);
  if (text.length > 0) text = text[0].toUpperCase() + text.slice(1);
  return { text, hitMaxLength: hitMax };
}


