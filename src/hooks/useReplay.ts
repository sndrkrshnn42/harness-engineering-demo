import { useReducer, useCallback } from 'react';
import { pipelineReducer, createInitialState, StageId, STAGE_DEFINITIONS } from '../types';
import { REPLAY_DATA, REPLAY_CHAR_RATE } from '../constants/replayData';

export function useReplay() {
  const [state, dispatch] = useReducer(pipelineReducer, undefined, createInitialState);

  const runReplay = useCallback(async () => {
    dispatch({ type: 'START', timestamp: Date.now() });

    const pipelineStart = Date.now();

    for (const def of STAGE_DEFINITIONS) {
      const entry = REPLAY_DATA.find(r => r.stageId === def.id);
      if (!entry) continue;

      if (def.id > 1) await new Promise(r => setTimeout(r, 600));

      dispatch({ type: 'STAGE_START', stageId: def.id as StageId });

      // Replay character by character at simulated speed
      const chars = entry.output.split('');
      const chunkSize = 8; // emit 8 chars per tick
      const delayPerChunk = Math.round(chunkSize / REPLAY_CHAR_RATE);

      for (let i = 0; i < chars.length; i += chunkSize) {
        const chunk = chars.slice(i, i + chunkSize).join('');
        dispatch({ type: 'STAGE_APPEND', stageId: def.id as StageId, text: chunk });
        await new Promise(r => setTimeout(r, delayPerChunk));
      }

      dispatch({
        type: 'STAGE_COMPLETE',
        stageId: def.id as StageId,
        elapsedMs: entry.elapsedMs,
      });
    }

    dispatch({ type: 'PIPELINE_COMPLETE', totalElapsedMs: Date.now() - pipelineStart });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return { state, runReplay, reset };
}
