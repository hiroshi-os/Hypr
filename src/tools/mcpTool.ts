import { z } from "zod";
import * as React from "react";
import { createTool, ToolDef } from "./index.ts";
import { MCPClient } from "../mcp/client.ts";

export const activeMcpClients: MCPClient[] = [];
export const dynamicMcpTools: ToolDef[] = [];

// Helper to convert JSON schema types to basic zod types
function jsonToZod(schema: any): any {
  if (!schema || !schema.properties) {
    return z.object({});
  }

  const shape: Record<string, any> = {};
  for (const [key, prop] of Object.entries<any>(schema.properties)) {
    let zodType: any = z.any();
    if (prop.type === "string") {
      zodType = z.string();
    } else if (prop.type === "number" || prop.type === "integer") {
      zodType = z.number();
    } else if (prop.type === "boolean") {
      zodType = z.boolean();
    } else if (prop.type === "array") {
      zodType = z.array(z.any());
    }

    if (prop.description) {
      zodType = zodType.describe(prop.description);
    }

    const required = schema.required || [];
    if (!required.includes(key)) {
      zodType = zodType.optional();
    }

    shape[key] = zodType;
  }

  return z.object(shape);
}

export const connectMcpServerTool = createTool({
  name: "connect_mcp_server",
  description: "Connect to an external MCP server process and dynamically inject its tools.",
  schema: z.object({
    command: z.string().describe("Executable file path or command to launch the MCP server (e.g. node, python, or absolute path)"),
    args: z.array(z.string()).describe("Command line arguments for the server process")
  }),
  isReadOnly: false,
  isConcurrencySafe: false,
  execute: async (args) => {
    try {
      const client = new MCPClient(args.command, args.args);
      await client.start();
      activeMcpClients.push(client);

      // Query tools from the MCP server
      const tools = await client.listTools();

      tools.forEach(t => {
        const zodSchema = jsonToZod(t.inputSchema);
        const dynamicTool = createTool({
          name: t.name,
          description: t.description,
          schema: zodSchema,
          isReadOnly: false, // default to false for safety check
          isConcurrencySafe: true,
          execute: async (toolArgs) => {
            const res = await client.callTool(t.name, toolArgs);
            if (res.isError) {
              return { isError: true, content: res.message || "Error executing MCP tool" };
            }
            return {
              isError: false,
              content: typeof res.content === "string" ? res.content : JSON.stringify(res.content || res, null, 2)
            };
          },
          renderProgress: (toolArgs) => {
            return React.createElement("span", null, `🔌 Remote Call: ${t.name}(${JSON.stringify(toolArgs)})`);
          }
        });
        dynamicMcpTools.push(dynamicTool);
      });

      return {
        isError: false,
        content: `Successfully connected. Loaded ${tools.length} remote tools:\n` + tools.map(t => `- ${t.name}`).join("\n")
      };

    } catch (e: any) {
      return {
        isError: true,
        content: `Failed to connect to MCP server: ${e.message}`
      };
    }
  },
  renderProgress: (args) => {
    return React.createElement("span", null, `🔌 Spawning MCP connection to ${args.command}...`);
  }
});
