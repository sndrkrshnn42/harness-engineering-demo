import { useEffect, useRef, useState } from 'react';
import { StageDefinition, StageState } from '../types';
import { MarkdownOutput } from './MarkdownOutput';
import { AgentLogOutput } from './AgentLogOutput';
import Status from '@ingka/status';
import Pill from '@ingka/pill';
import InlineMessage from '@ingka/inline-message';
import Loading from '@ingka/loading';
import LoadingBall from '@ingka/loading/LoadingBall';

interface Props {
  definition: StageDefinition;
  stageState: StageState;
  onRetry?: () => void;
}

/** Map stage status to Skapa Status variant */
function statusVariant(status: StageState['status']): 'positive' | 'negative' | 'cautionary' | 'indeterminate' | 'informative' {
  switch (status) {
    case 'running': return 'informative';
    case 'complete': return 'positive';
    case 'error': return 'negative';
    default: return 'indeterminate';
  }
}

export function StageCard({ definition, stageState, onRetry }: Props) {
  const outputRef = useRef<HTMLDivElement>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const prevStatusRef = useRef(stageState.status);
  const [showLogs, setShowLogs] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  // Stages 2 (codegen) and 5 (docker build & deploy) get a loading UI instead of raw logs
  const isAgentStage = definition.id === 2 || definition.id === 5;

  // Auto-scroll output to bottom as text streams in
  useEffect(() => {
    if (outputRef.current && stageState.status === 'running') {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [stageState.output, stageState.agentLogs.length, stageState.status]);

  // Detect transition to complete for pulse animation
  useEffect(() => {
    if (prevStatusRef.current === 'running' && stageState.status === 'complete') {
      setJustCompleted(true);
      setCollapsed(true); // Auto-collapse when stage completes
      const timer = setTimeout(() => setJustCompleted(false), 700);
      return () => clearTimeout(timer);
    }
    if (stageState.status === 'running') {
      setCollapsed(false); // Auto-expand when stage starts running
    }
    prevStatusRef.current = stageState.status;
  }, [stageState.status]);

  const isRunning = stageState.status === 'running';
  const isComplete = stageState.status === 'complete';
  const isError = stageState.status === 'error';
  const hasOutput = stageState.output.length > 0;
  const hasAgentLogs = stageState.agentLogs.length > 0;

  return (
    <div className="relative">
      {/* Data flow connector dot -- appears briefly after completion */}
      {justCompleted && definition.id < 6 && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10">
          <span
            className="w-1.5 h-1.5 rounded-full inline-block animate-data-flow"
            style={{ backgroundColor: 'var(--skapa-positive)' }}
          />
        </div>
      )}

      <div
        className={`
          border rounded-skapa-m overflow-hidden transition-all duration-300
          ${isRunning ? 'border-skapa-informative shadow-sm' : ''}
          ${isComplete && justCompleted ? 'animate-stage-complete border-skapa-positive' : ''}
          ${isComplete && !justCompleted ? 'border-skapa-neutral-3' : ''}
          ${isError ? 'border-skapa-negative' : ''}
          ${!isRunning && !isComplete && !isError ? 'border-skapa-neutral-3' : ''}
        `}
      >
        {/* Stage header — clickable to toggle collapse */}
        <div
          className={`
            flex items-center justify-between px-4 py-3 cursor-pointer select-none
            ${isRunning ? 'bg-skapa-neutral-2' : 'bg-skapa-neutral-1'}
          `}
          onClick={() => setCollapsed(prev => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setCollapsed(prev => !prev);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Status variant={statusVariant(stageState.status)} small />
              <span className="text-xs font-bold text-skapa-text-3">{definition.id}</span>
            </div>
            <span className={`text-sm font-medium ${
              isRunning ? 'text-skapa-text-1' :
              isComplete ? 'text-skapa-text-2' : 'text-skapa-text-3'
            }`}>
              {definition.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Role displaced badge */}
            <Pill
              label={definition.roleDisplaced}
              size="xsmall"
              className={isComplete ? 'line-through opacity-60' : ''}
            />
            {/* Elapsed time */}
            {isComplete && stageState.elapsedMs !== null && (
              <span className="text-xs text-skapa-text-3">
                {(stageState.elapsedMs / 1000).toFixed(1)}s
              </span>
            )}
            {/* Collapse indicator */}
            <span className="text-xs text-skapa-text-4 transition-transform duration-200"
                  style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}>
              &#9656;
            </span>
          </div>
        </div>

        {/* Collapsible content area */}
        {!collapsed && (
          <>
            {/* Output area -- only render when there's something to show */}
            {(hasOutput || isRunning || isError) && (
              <div className={`border-t ${
                isRunning ? 'border-skapa-informative/30' : 'border-skapa-neutral-3'
              }`}>
                {isError ? (
                  <div className="px-4 py-3">
                    <InlineMessage
                      variant="negative"
                      title="Stage failed"
                      body={stageState.errorMessage}
                      actions={onRetry ? [{ text: 'Retry stage', type: 'secondary' as const, size: 'small' as const, onClick: onRetry as unknown as React.MouseEventHandler<HTMLButtonElement> }] : undefined}
                    />
                  </div>
                ) : isAgentStage && isRunning ? (
                  /* Agent stages (2 & 5): show Loading indicator with optional log view */
                  <div className="px-4 py-3 bg-skapa-neutral-2/50">
                    <Loading
                      text={definition.id === 2
                        ? 'Generating code — Adrian & Rocky working...'
                        : 'Building & deploying to Kubernetes...'}
                      labelTransitions
                    >
                      <LoadingBall size="small" color="emphasised" />
                    </Loading>

                    {/* Toggle to show raw logs */}
                    {(hasOutput || hasAgentLogs) && (
                      <div className="mt-2">
                        <button
                          className="text-[10px] text-skapa-text-3 hover:text-skapa-text-1 underline underline-offset-2 transition-colors"
                          onClick={(e) => { e.stopPropagation(); setShowLogs(prev => !prev); }}
                        >
                          {showLogs ? 'Hide logs' : 'Show logs'}
                        </button>
                        {showLogs && (
                          <div
                            ref={outputRef}
                            className="mt-1 max-h-48 overflow-y-auto"
                          >
                            {hasAgentLogs ? (
                              <AgentLogOutput entries={stageState.agentLogs} />
                            ) : (
                              <MarkdownOutput content={stageState.output} />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    ref={outputRef}
                    className={`
                      overflow-y-auto transition-[max-height] duration-300
                      ${isRunning ? 'max-h-64 min-h-[4rem]' : isComplete ? 'max-h-80' : 'max-h-96'}
                      px-4 py-3 bg-skapa-neutral-2/50
                    `}
                  >
                    {isAgentStage && hasAgentLogs ? (
                      <AgentLogOutput entries={stageState.agentLogs} />
                    ) : (
                      <MarkdownOutput content={stageState.output} />
                    )}
                    {/* Blinking cursor while running */}
                    {isRunning && (
                      <span className="animate-pulse" style={{ color: 'var(--skapa-brand-blue)' }}>&#9611;</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Idle state placeholder */}
            {stageState.status === 'idle' && (
              <div className="px-4 py-2 border-t border-skapa-neutral-3">
                <p className="text-xs text-skapa-text-4">
                  Waiting — {definition.expectedOutputLabel}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
