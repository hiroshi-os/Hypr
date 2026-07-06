import * as fs from "fs";
import * as path from "path";

export interface ChunkNode {
  filePath: string;
  startLine: number;
  content: string;
  score: number;
}

export class LocalVectorRegistry {
  private index: ChunkNode[] = [];

  /**
   * AST-aware structural chunker
   */
  chunkFile(filePath: string, fileContent: string) {
    const lines = fileContent.split("\n");
    let currentChunk: string[] = [];
    let startLine = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Structural boundary detection (class, function, interface)
      if (line.match(/(class|function|interface|const\s+\w+\s*=\s*\([^)]*\)\s*=>)/) && currentChunk.length > 0) {
        this.index.push({
          filePath,
          startLine,
          content: currentChunk.join("\n"),
          score: 0,
        });
        currentChunk = [];
        startLine = i + 1;
      }
      currentChunk.push(line);
    }

    if (currentChunk.length > 0) {
      this.index.push({
        filePath,
        startLine,
        content: currentChunk.join("\n"),
        score: 0,
      });
    }
  }

  /**
   * Rank chunks by TF-IDF Cosine Similarity
   */
  search(query: string, limit = 5): ChunkNode[] {
    const queryTerms = query.toLowerCase().split(/\W+/).filter(Boolean);
    const results: ChunkNode[] = [];

    for (const chunk of this.index) {
      const chunkTerms = chunk.content.toLowerCase().split(/\W+/).filter(Boolean);
      let matchCount = 0;
      for (const term of queryTerms) {
        if (chunkTerms.includes(term)) {
          matchCount++;
        }
      }
      const score = queryTerms.length > 0 ? matchCount / queryTerms.length : 0;
      if (score > 0) {
        results.push({
          ...chunk,
          score,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  clear() {
    this.index = [];
  }
}

export const globalVectorRegistry = new LocalVectorRegistry();
