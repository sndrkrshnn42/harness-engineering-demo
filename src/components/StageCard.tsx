import { useEffect, useRef, useState } from 'react';
import { StageDefinition, StageState } from '../types';
import { MarkdownOutput } from './MarkdownOutput';

interface Props {
  definition: StageDefinition;
  stageState: StageState;
  onRetry?: () => void;
}

const STATUS_ICON = {
  idle: <span className="w-2 h-2 rounded-full bg-zinc-600 inline-block" />,
  running: <span className="w-2 h-2 rounded-full bg-violet-400 inline-block animate-pulse" />,
  complete: <span className="text-emerald-400 text-sm">&#10003;</span>,
  error: <span className="text-red-400 text-sm">&#10005;</span>,
};

export function StageCard({ definition, stageState, onRetry }: Props) {
  const outputRef = useRef<HTMLDivElement>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const prevStatusRef = useRef(stageState.status);

  // Auto-scroll output to bottom as text streams in
  useEffect(() => {
    if (outputRef.current && stageState.status === 'running') {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [stageState.output, stageState.status]);

  // Detect transition to complete for pulse animation
  useEffect(() => {
    if (prevStatusRef.current === 'running' && stageState.status === 'complete') {
      setJustCompleted(true);
      const timer = setTimeout(() => setJustCompleted(false), 700);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = stageState.status;
  }, [stageState.status]);

  const isRunning = stageState.status === 'running';
  const isComplete = stageState.status === 'complete';
  const isError = stageState.status === 'error';
  const hasOutput = stageState.output.length > 0;

  return (
    <div className="relative">
      {/* Data flow connector dot — appears briefly after completion */}
      {justCompleted && definition.id < 6 && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-data-flow" />
        </div>
      )}

      <div
        className={`
          border rounded-lg overflow-hidden transition-all duration-300
          ${isRunning ? 'border-violet-500/60 shadow-sm shadow-violet-900/30' : ''}
          ${isComplete && justCompleted ? 'animate-stage-complete border-emerald-500/60' : ''}
          ${isComplete && !justCompleted ? 'border-zinc-700' : ''}
          ${isError ? 'border-red-700/60' : ''}
          ${!isRunning && !isComplete && !isError ? 'border-zinc-800' : ''}
        `}
      >
        {/* Stage header */}
        <div className={`
          flex items-center justify-between px-4 py-3
          ${isRunning ? 'bg-zinc-900' : 'bg-zinc-950'}
        `}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {STATUS_ICON[stageState.status]}
              <span className="text-xs font-mono text-zinc-500">{definition.id}</span>
            </div>
            <span className={`text-sm font-medium ${
              isRunning ? 'text-white' :
              isComplete ? 'text-zinc-300' : 'text-zinc-500'
            }`}>
              {definition.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Role displaced badge */}
            <span className={`
              text-xs px-2 py-0.5 rounded-full border transition-all duration-500
              ${isComplete
                ? 'border-zinc-700 text-zinc-500 bg-zinc-900/50 line-through'
                : 'border-orange-800/60 text-orange-400 bg-orange-950/30'
              }
            `}>
              {definition.roleDisplaced}
            </span>
            {/* Elapsed time */}
            {isComplete && stageState.elapsedMs !== null && (
              <span className="text-xs font-mono text-zinc-500">
                {(stageState.elapsedMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </div>

        {/* Output area — only render when there's something to show */}
        {(hasOutput || isRunning || isError) && (
          <div className={`border-t ${
            isRunning ? 'border-violet-900/40' : 'border-zinc-800'
          }`}>
            {isError ? (
              <div className="px-4 py-3 bg-red-950/20">
                <p className="text-sm text-red-400 font-mono">{stageState.errorMessage}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="mt-2 text-xs text-red-400 border border-red-800 rounded px-2 py-1 hover:bg-red-950/40"
                  >
                    Retry stage
                  </button>
                )}
              </div>
            ) : (
              <div
                ref={outputRef}
                className={`
                  overflow-y-auto transition-[max-height] duration-300
                  ${isRunning ? 'max-h-64 min-h-[4rem]' : isComplete ? 'max-h-80' : 'max-h-96'}
                  px-4 py-3 bg-zinc-900/50
                `}
              >
                <MarkdownOutput content={stageState.output} />
                {/* Blinking cursor while running */}
                {isRunning && (
                  <span className="animate-pulse text-violet-400 font-mono">&#9611;</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Idle state placeholder */}
        {stageState.status === 'idle' && (
          <div className="px-4 py-2 border-t border-zinc-800">
            <p className="text-xs text-zinc-600 font-mono">
              Waiting — {definition.expectedOutputLabel}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
