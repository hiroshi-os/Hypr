import { expect, test, describe } from "bun:test";
import { ConversationState } from "../src/state/engine.ts";
import { classifyCommand, DefaultPermissionGate } from "../src/permissions/middleware.ts";
import { readFileTool, writeFileTool, editFileTool } from "../src/tools/fileTools.ts";
import * as fs from "fs";
import * as path from "path";

describe("Hypr State Engine", () => {
  test("Serialization & Deserialization", () => {
    const state = new ConversationState("Custom Prompt");
    state.addMessage({ role: "user", content: "Hello" });
    state.addMessage({ role: "assistant", content: "Hi" });
    
    const serialized = state.serialize();
    const deserialized = ConversationState.deserialize(serialized);
    
    expect(deserialized.getSystemPrompt()).toBe("Custom Prompt");
    expect(deserialized.getMessages().length).toBe(2);
    expect(deserialized.getMessages()[0].content).toBe("Hello");
  });

  test("Compaction", () => {
    const state = new ConversationState();
    for (let i = 0; i < 20; i++) {
      state.addMessage({ role: "user", content: `Msg ${i}` });
    }
    state.compact(10);
    expect(state.getMessages().length).toBe(10);
    expect(state.getMessages()[2].content).toContain("Context Compacted");
  });
});

describe("Permissions Middleware Classifier", () => {
  test("Classify read-only commands", () => {
    const check1 = classifyCommand("git status");
    expect(check1.isReadOnly).toBe(true);

    const check2 = classifyCommand("bun test");
    expect(check2.isReadOnly).toBe(true);
  });

  test("Classify destructive commands", () => {
    const check1 = classifyCommand("rm -rf node_modules");
    expect(check1.isReadOnly).toBe(false);

    const check2 = classifyCommand("git push origin main");
    expect(check2.isReadOnly).toBe(false);
  });
});

describe("File Tools Integration", () => {
  const testFile = path.resolve("./test_temp_file.txt");

  test("Write, Read, Edit workflow", async () => {
    // 1. Write file
    const writeRes = await writeFileTool.execute({
      path: testFile,
      content: "line 1\nline 2\nline 3"
    });
    expect(writeRes.isError).toBe(false);

    // 2. Read file
    const readRes = await readFileTool.execute({
      path: testFile,
      startLine: 1,
      endLine: 2
    });
    expect(readRes.isError).toBe(false);
    expect(readRes.content).toBe("line 1\nline 2");

    // 3. Edit file
    const editRes = await editFileTool.execute({
      path: testFile,
      search: "line 2",
      replace: "line 2 modified"
    });
    expect(editRes.isError).toBe(false);

    const readRes2 = await readFileTool.execute({
      path: testFile
    });
    expect(readRes2.content).toBe("line 1\nline 2 modified\nline 3");

    // Cleanup
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });
});
