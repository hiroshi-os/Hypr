import { z } from "zod";
import * as React from "react";
import { createTool } from "../tools/index.ts";

export interface TaskNode {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  dependencies: string[];
  estimatedFiles: string[];
}

export class TaskScheduler {
  private tasks: TaskNode[] = [];

  constructor() {}

  getTasks(): TaskNode[] {
    return [...this.tasks];
  }

  addTask(task: TaskNode) {
    if (this.tasks.some(t => t.id === task.id)) return;
    this.tasks.push(task);
  }

  updateTaskStatus(id: string, status: TaskNode["status"]) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.status = status;
    }
  }

  clear() {
    this.tasks = [];
  }
}

// Global instance for access within tools
export const globalScheduler = new TaskScheduler();

export const scheduleTasksTool = createTool({
  name: "schedule_tasks",
  description: "Schedule a list of tasks for autonomous execution.",
  schema: z.object({
    tasks: z.array(z.object({
      id: z.string().describe("Unique identifier for this task"),
      title: z.string().describe("Short description of what needs to be done"),
      dependencies: z.array(z.string()).describe("List of task IDs that must complete first"),
      estimatedFiles: z.array(z.string()).describe("Files expected to be touched by this task")
    })).min(1).describe("List of tasks to append to scheduler")
  }),
  isReadOnly: true,
  isConcurrencySafe: true,
  execute: async (args) => {
    args.tasks.forEach(t => {
      globalScheduler.addTask({
        id: t.id,
        title: t.title,
        status: "pending",
        dependencies: t.dependencies,
        estimatedFiles: t.estimatedFiles
      });
    });
    return { isError: false, content: `Successfully scheduled ${args.tasks.length} tasks.` };
  },
  renderProgress: (args) => {
    return React.createElement("span", null, `📅 Scheduling ${args.tasks.length} tasks...`);
  }
});

export const updateTaskStatusTool = createTool({
  name: "update_task_status",
  description: "Update the execution state of an active task node.",
  schema: z.object({
    id: z.string().describe("Task node identifier"),
    status: z.enum(["pending", "running", "completed", "failed"]).describe("New status of the task")
  }),
  isReadOnly: true,
  isConcurrencySafe: true,
  execute: async (args) => {
    globalScheduler.updateTaskStatus(args.id, args.status);
    return { isError: false, content: `Updated task '${args.id}' status to ${args.status}.` };
  },
  renderProgress: (args) => {
    return React.createElement("span", null, `🔄 Updating task ${args.id} to ${args.status}...`);
  }
});
