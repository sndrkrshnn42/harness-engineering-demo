export interface ReplayEntry {
  stageId: number;
  output: string;
  elapsedMs: number;
}

// Populate this array with one full successful pipeline run before the demo.
// Instructions: Run the pipeline once with the default spec, capture the outputs
// from the browser console (add console.log(output) to streamStage), and paste
// them here. This ensures the replay uses authentic AI-generated content.

export const REPLAY_DATA: ReplayEntry[] = [
  // { stageId: 1, output: '...', elapsedMs: 7840 },
  // { stageId: 2, output: '...', elapsedMs: 14200 },
  // { stageId: 3, output: '...', elapsedMs: 6990 },
  // { stageId: 4, output: '...', elapsedMs: 8120 },
  // { stageId: 5, output: '...', elapsedMs: 7340 },
  // { stageId: 6, output: '...', elapsedMs: 4880 },
];

// Token replay speed: characters per millisecond (simulates streaming)
export const REPLAY_CHAR_RATE = 0.08; // ~80 chars/second
