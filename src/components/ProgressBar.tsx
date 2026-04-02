import { PipelineState, STAGE_DEFINITIONS } from '../types';

interface Props {
  pipelineState: PipelineState;
}

export function ProgressBar({ pipelineState }: Props) {
  const completedCount = STAGE_DEFINITIONS.filter(
    d => pipelineState.stages[d.id].status === 'complete'
  ).length;

  const total = STAGE_DEFINITIONS.length;
  const pct = Math.round((completedCount / total) * 100);
  const isComplete = pipelineState.status === 'complete';

  return (
    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${
          isComplete ? 'bg-emerald-500' : 'bg-violet-500'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
