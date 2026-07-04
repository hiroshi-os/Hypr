import { z, ZodObject, ZodRawShape } from "zod";
import * as React from "react";

export interface ToolResult {
  isError: boolean;
  content: string;
}

export interface ToolDef<T extends ZodRawShape = ZodRawShape> {
  name: string;
  description: string;
  schema: ZodObject<T>;
  isReadOnly: boolean;
  isConcurrencySafe: boolean;
  execute: (args: any) => Promise<ToolResult>;
  renderProgress: (args: any) => React.ReactNode;
}

// Helper to create a typed tool definition
export function createTool<T extends ZodRawShape>(
  tool: ToolDef<T>
): ToolDef<T> {
  return tool;
}
