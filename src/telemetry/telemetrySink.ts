import { mkdirSync } from 'fs';
import { dirname } from 'path';
import type { TelemetryEvent } from '../types/index.js';

export class TelemetrySink {
  private readonly enabled: boolean;
  private readonly logPath: string;

  constructor(logPath: string, enabled: boolean) {
    this.logPath = logPath;
    this.enabled = enabled;
  }

  append(event: TelemetryEvent): void {
    if (!this.enabled) {
      return;
    }

    try {
      // Ensure the directory exists silently
      mkdirSync(dirname(this.logPath), { recursive: true });

      const line = JSON.stringify(event) + '\n';
      // Using appendFileSync for simplicity; callers expect synchronous behavior
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const { appendFileSync } = require('fs');
      appendFileSync(this.logPath, line, 'utf8');
    } catch (err) {
      // Resilient: log to stderr and continue without crashing
      console.error('[TelemetrySink] Failed to append event:', err instanceof Error ? err.message : String(err));
    }
  }
}
