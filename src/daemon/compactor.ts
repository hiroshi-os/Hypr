import { ConversationState } from "../state/engine.ts";

export class BackgroundCompactor {
  private threshold = 18;

  constructor(threshold?: number) {
    if (threshold) this.threshold = threshold;
  }

  /**
   * Asynchronously checks state message volume and condenses history
   * if it breaches the threshold, returning true if compaction was applied.
   */
  async checkAndCompact(state: ConversationState): Promise<boolean> {
    const originalCount = state.getMessages().length;
    if (originalCount > this.threshold) {
      // Run in background macro-task to simulate async execution
      await Bun.sleep(10);
      state.compact(this.threshold); // Compact down to threshold
      return true;
    }
    return false;
  }
}

export const globalCompactor = new BackgroundCompactor();
