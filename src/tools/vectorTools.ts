import { z } from "zod";
import { globalVectorRegistry } from "../daemon/vector.ts";

export const semanticCodeSearchTool = {
  name: "semantic_code_search",
  description: "Execute a local database vector similarity search query to parse relevant code chunk nodes.",
  inputSchema: z.object({
    query: z.string().describe("Semantic natural language query string to rank similarity scores"),
    limit: z.number().optional().describe("Maximum match results limit (default 5)"),
  }),
  execute: async (input: { query: string; limit?: number }) => {
    const results = globalVectorRegistry.search(input.query, input.limit || 5);
    return {
      content: JSON.stringify({
        query: input.query,
        matchNodes: results.map(r => ({
          filePath: r.filePath,
          startLine: r.startLine,
          score: r.score,
        })),
      }),
      isError: false,
    };
  },
};
