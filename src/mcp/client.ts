import { spawn } from "child_process";

export interface MCPToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export class MCPClient {
  private proc: any;
  private command: string;
  private args: string[];
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private buffer = "";

  constructor(command: string, args: string[] = []) {
    this.command = command;
    this.args = args;
  }

  async start(): Promise<void> {
    this.proc = spawn(this.command, this.args, { stdio: ["pipe", "pipe", "inherit"] });
    
    this.proc.stdout.on("data", (chunk: Buffer) => {
      this.buffer += chunk.toString();
      this.processBuffer();
    });

    this.proc.on("error", (err: any) => {
      console.error(`MCP Subprocess Error: ${err.message}`);
    });
  }

  private processBuffer() {
    let newlineIdx: number;
    while ((newlineIdx = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, newlineIdx).trim();
      this.buffer = this.buffer.slice(newlineIdx + 1);
      
      if (!line) continue;

      try {
        const response = JSON.parse(line);
        if (response.id !== undefined) {
          const handler = this.pendingRequests.get(response.id);
          if (handler) {
            this.pendingRequests.delete(response.id);
            if (response.error) {
              handler.reject(response.error);
            } else {
              handler.resolve(response.result);
            }
          }
        }
      } catch (err) {
        // Ignored parse error on invalid line
      }
    }
  }

  private sendJsonRpc(method: string, params: any): Promise<any> {
    const id = ++this.requestId;
    const payload = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.proc.stdin.write(JSON.stringify(payload) + "\n");
    });
  }

  async listTools(): Promise<MCPToolSchema[]> {
    const result = await this.sendJsonRpc("tools/list", {});
    return result.tools || [];
  }

  async callTool(name: string, args: any): Promise<any> {
    const result = await this.sendJsonRpc("tools/call", { name, arguments: args });
    return result;
  }

  close() {
    if (this.proc) {
      this.proc.kill();
    }
  }
}
