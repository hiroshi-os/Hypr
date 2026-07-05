/**
 * src/tools/extensionTool.ts
 *
 * register_extension: Loads and provisions a plugin file into the
 * sandboxed PluginManager runtime. Validates plugin source before loading.
 */

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { createTool } from "./index.ts";
import { globalPluginManager } from "../plugins/manager.ts";

export const registerExtensionTool = createTool({
  name: "register_extension",
  description: "Loads a local plugin file into the isolated Hypr plugin sandbox. The plugin can hook into beforeToolCall, afterToolCall, and transformPrompt lifecycle events.",
  isReadOnly: false,
  schema: z.object({
    pluginPath: z.string().describe("Absolute or relative path to the plugin .js file"),
  }),
  execute: async ({ pluginPath }) => {
    const resolved = path.resolve(pluginPath);
    if (!fs.existsSync(resolved)) {
      return { isError: true, content: `Plugin file not found: ${resolved}` };
    }

    const ext = path.extname(resolved);
    if (ext !== ".js") {
      return { isError: true, content: `Only .js plugin files are supported (received ${ext})` };
    }

    try {
      const plugin = globalPluginManager.register(resolved);
      return {
        isError: false,
        content: `Plugin '${plugin.name}' (v${plugin.version}) loaded into sandbox at ${plugin.loadedAt}`,
      };
    } catch (err: any) {
      return { isError: true, content: `Failed to load plugin: ${err.message}` };
    }
  },
});
