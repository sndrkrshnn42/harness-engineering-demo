import { useEffect, useRef } from 'react';
import { PipelineState, STAGE_DEFINITIONS } from '../types';
import { StageCard } from './StageCard';
import { VerdictCard } from './VerdictCard';
import { ProgressBar } from './ProgressBar';
import { ElapsedTimer } from './ElapsedTimer';
import { MetricsBar } from './MetricsBar';
import { FileTree } from './FileTree';
import { PipelineChart } from './PipelineChart';
import type { AgentFile } from '../hooks/usePipeline';

interface Props {
  pipelineState: PipelineState;
  agentFiles: AgentFile[];
  workspaceId: string | null;
}

export function PipelinePanel({ pipelineState, agentFiles, workspaceId }: Props) {
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

  // Show file tree when Stage 2 or Stage 3 (Infra gen) is running or complete
  const stage2Status = pipelineState.stages[2].status;
  const stage3Status = pipelineState.stages[3].status;
  const showFileTree =
    stage2Status === 'running' || stage2Status === 'complete' ||
    stage3Status === 'running' || stage3Status === 'complete';

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">Pipeline execution</h2>
        <ElapsedTimer
          startedAt={pipelineState.startedAt}
          stoppedAt={
            isComplete && pipelineState.startedAt && pipelineState.totalElapsedMs
              ? pipelineState.totalElapsedMs
              : null
          }
        />
      </div>

      {/* Progress bar */}
      <ProgressBar pipelineState={pipelineState} />

      {/* Live metrics */}
      <MetricsBar pipelineState={pipelineState} />

      {/* Stage cards — scrollable */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 min-h-0">
        {STAGE_DEFINITIONS.map(def => (
          <div key={def.id} data-stage-id={def.id}>
            <StageCard
              definition={def}
              stageState={pipelineState.stages[def.id]}
            />
            {/* File tree appears after Stage 2 card */}
            {def.id === 2 && (
              <FileTree files={agentFiles} isVisible={showFileTree} workspaceId={workspaceId} />
            )}
          </div>
        ))}

        {/* Stage performance chart — only when complete */}
        {isComplete && <PipelineChart pipelineState={pipelineState} />}

        {/* Verdict card — only when complete */}
        {isComplete && pipelineState.totalElapsedMs !== null && (
          <VerdictCard totalElapsedMs={pipelineState.totalElapsedMs} />
        )}
      </div>
    </div>
  );
}
