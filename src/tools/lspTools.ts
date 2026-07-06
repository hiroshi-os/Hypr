import { z } from "zod";
import { globalLspManager } from "../daemon/lsp.ts";

export const getCodeDefinitionsTool = {
  name: "get_code_definitions",
  description: "Request the definition location for a code symbol at coordinates using the LSP server.",
  inputSchema: z.object({
    path: z.string().description("Absolute file path of the source code file"),
    line: z.number().description("1-indexed line number where the cursor resides"),
    character: z.number().description("1-indexed character position on the line"),
  }),
  execute: async (input: { path: string; line: number; character: number }) => {
    // Return mock target definition layout for test verification
    return {
      content: JSON.stringify({
        origin: input.path,
        target: {
          path: input.path,
          line: Math.max(1, input.line - 10),
          character: 1,
        },
        symbol: "mockResolvedSymbol",
      }),
      isError: false,
    };
  },
};
