import { useEffect, useRef } from 'react';
import { PipelineState, STAGE_DEFINITIONS } from '../types';
import { StageCard } from './StageCard';
import { VerdictCard } from './VerdictCard';
import { ProgressBar } from './ProgressBar';
import { MetricsBar } from './MetricsBar';
import { PipelineChart } from './PipelineChart';

interface Props {
  pipelineState: PipelineState;
}

export function PipelinePanel({ pipelineState }: Props) {
  const isComplete = pipelineState.status === 'complete';
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the currently running stage card
  useEffect(() => {
    if (!pipelineState.currentStage || !scrollContainerRef.current) return;
    const activeCard = scrollContainerRef.current.querySelector(
      `[data-stage-id="${pipelineState.currentStage}"]`
    );
    if (activeCard) {
      activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [pipelineState.currentStage]);

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-skapa-text-1">Pipeline execution</h2>
      </div>

      {/* Progress bar */}
      <ProgressBar pipelineState={pipelineState} />

      {/* Live metrics */}
      <MetricsBar pipelineState={pipelineState} />

      {/* Stage cards -- scrollable */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 min-h-0">
        {STAGE_DEFINITIONS.map(def => (
          <div key={def.id} data-stage-id={def.id}>
            <StageCard
              definition={def}
              stageState={pipelineState.stages[def.id]}
            />
          </div>
        ))}

        {/* Stage performance chart -- only when complete */}
        {isComplete && <PipelineChart pipelineState={pipelineState} />}

        {/* Verdict card -- only when complete */}
        {isComplete && pipelineState.totalElapsedMs !== null && (
          <VerdictCard totalElapsedMs={pipelineState.totalElapsedMs} />
        )}
      </div>
    </div>
  );
}
