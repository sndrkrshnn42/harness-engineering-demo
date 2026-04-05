import { useMemo } from 'react';
import { PipelineState, STAGE_DEFINITIONS } from '../types';

interface Props {
  pipelineState: PipelineState;
}

interface MetricItem {
  label: string;
  value: string;
  active: boolean;
}

export function MetricsBar({ pipelineState }: Props) {
  const isActive = pipelineState.status === 'running' || pipelineState.status === 'complete';

  const metrics = useMemo((): MetricItem[] => {
    const allOutput = STAGE_DEFINITIONS.reduce((acc, def) => {
      return acc + pipelineState.stages[def.id].output;
    }, '');

    const totalChars = allOutput.length;
    const estimatedTokens = Math.round(totalChars / 4);
    const lineCount = allOutput.split('\n').length - 1;

    const completedCount = STAGE_DEFINITIONS.filter(
      d => pipelineState.stages[d.id].status === 'complete'
    ).length;

    // Stage 1 displaces 2 roles (BA/Analyst + Solution Architect), Stage 2 displaces 2 roles
    // (Software Developer + Test Engineer), all others displace 1
    const stage1Complete = pipelineState.stages[1]?.status === 'complete';
    const stage2Complete = pipelineState.stages[2]?.status === 'complete';
    const rolesDisplaced = completedCount + (stage1Complete ? 1 : 0) + (stage2Complete ? 1 : 0);

    const isRunning = pipelineState.status === 'running';

    return [
      {
        label: 'Stages',
        value: `${completedCount}/${STAGE_DEFINITIONS.length}`,
        active: isRunning,
      },
      {
        label: 'Tokens',
        value: estimatedTokens.toLocaleString(),
        active: isRunning,
      },
      {
        label: 'Lines',
        value: lineCount.toLocaleString(),
        active: isRunning,
      },
      {
        label: 'Roles displaced',
        value: `${rolesDisplaced}`,
        active: isRunning,
      },
    ];
  }, [pipelineState]);

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-4 px-1 py-1.5">
      {metrics.map(m => (
        <div key={m.label} className="flex items-center gap-1.5">
          <span className="text-xs text-skapa-text-3">{m.label}:</span>
          <span
            className={`text-xs font-bold ${m.active ? 'animate-counter-active' : ''}`}
            style={{ color: m.active ? 'var(--skapa-brand-blue)' : 'var(--skapa-positive)' }}
          >
            {m.value}
          </span>
        </div>
      ))}
    </div>
  );
}
