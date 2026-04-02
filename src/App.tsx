'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { usePipeline } from './hooks/usePipeline';
import { useReplay } from './hooks/useReplay';
import { DEFAULT_SPEC } from './constants/defaultSpec';
import { InputPanel } from './components/InputPanel';
import { PipelinePanel } from './components/PipelinePanel';
import { STAGE_DEFINITIONS } from './types';
import type { CodegenMode } from './types';

/** Generate a random hex session ID on mount (for terminal authenticity). */
function generateSessionId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export default function App() {
  const [inputSpec, setInputSpec] = useState(DEFAULT_SPEC);
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [codegenMode, setCodegenMode] = useState<CodegenMode>('opencode');
  const [patToken, setPatToken] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [sessionId, setSessionId] = useState('--------');
  useEffect(() => {
    setSessionId(generateSessionId());
  }, []);

  const pipeline = usePipeline(inputSpec, codegenMode, patToken, repoUrl);
  const replay = useReplay();

  const activeState = isReplayMode ? replay.state : pipeline.state;
  const isRunning = activeState.status === 'running';
  const isComplete = activeState.status === 'complete';

  const handleRun = useCallback(() => {
    if (isReplayMode) {
      replay.runReplay();
    } else {
      pipeline.runPipeline();
    }
  }, [isReplayMode, replay, pipeline]);

  const handleReset = useCallback(() => {
    if (isReplayMode) {
      replay.reset();
    } else {
      pipeline.reset();
    }
    setIsReplayMode(false);
  }, [isReplayMode, replay, pipeline]);

  const handleEnterReplay = useCallback(() => {
    pipeline.reset();
    setIsReplayMode(true);
  }, [pipeline]);

  // Terminal-style status line
  const statusLine = useMemo(() => {
    if (activeState.status === 'idle') return 'IDLE';
    if (activeState.status === 'complete') return 'COMPLETE';
    if (activeState.status === 'error') return 'ERROR';
    if (activeState.currentStage) {
      const def = STAGE_DEFINITIONS.find(d => d.id === activeState.currentStage);
      return `RUNNING Stage ${activeState.currentStage}/${STAGE_DEFINITIONS.length}${def ? ` — ${def.name}` : ''}`;
    }
    return 'RUNNING';
  }, [activeState.status, activeState.currentStage]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Terminal-style top bar */}
      <header className="border-b border-zinc-800 bg-zinc-950 relative overflow-hidden">
        {/* Subtle scanline overlay */}
        <div className="absolute inset-0 pointer-events-none scanline-overlay" />

        <div className="relative z-10 px-6 py-3 flex items-center justify-between font-mono">
          {/* Left: terminal prompt */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`
                w-2 h-2 rounded-full inline-block
                ${isRunning ? 'bg-violet-400 animate-pulse' : ''}
                ${isComplete ? 'bg-emerald-400' : ''}
                ${activeState.status === 'error' ? 'bg-red-400' : ''}
                ${activeState.status === 'idle' ? 'bg-zinc-600' : ''}
              `} />
              <span className="text-sm font-bold text-white tracking-tight">
                HARNESS-ENG
              </span>
            </div>
            <span className="text-xs text-zinc-600">|</span>
            <span className="text-xs text-zinc-500">
              session:{sessionId}
            </span>
            <span className="text-xs text-zinc-600">|</span>
            <span className="text-xs text-zinc-500">
              7 roles &middot; 0 handoffs
            </span>
          </div>

          {/* Right: status indicators */}
          <div className="flex items-center gap-3">
            {isReplayMode && (
              <span className="text-xs px-2 py-0.5 rounded font-mono bg-amber-900/40 text-amber-400 border border-amber-700/40">
                REPLAY
              </span>
            )}
            <span className={`
              text-xs px-2 py-0.5 rounded font-mono
              ${activeState.status === 'idle' ? 'bg-zinc-900 text-zinc-500 border border-zinc-800' : ''}
              ${activeState.status === 'running' ? 'bg-violet-900/40 text-violet-400 border border-violet-700/40' : ''}
              ${activeState.status === 'complete' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40' : ''}
              ${activeState.status === 'error' ? 'bg-red-900/40 text-red-400 border border-red-700/40' : ''}
            `}>
              [{statusLine}]
            </span>
          </div>
        </div>
      </header>

      {/* Main content — two-panel layout */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-[calc(100vh-53px)]">
        {/* Left: Input */}
        <div className="border-r border-zinc-800 p-5 flex flex-col min-h-0">
          <InputPanel
            value={inputSpec}
            onChange={setInputSpec}
            onRun={handleRun}
            onReset={handleReset}
            onEnterReplay={handleEnterReplay}
            isRunning={isRunning}
            isComplete={isComplete}
            codegenMode={codegenMode}
            onCodegenModeChange={setCodegenMode}
            patToken={patToken}
            onPatTokenChange={setPatToken}
            repoUrl={repoUrl}
            onRepoUrlChange={setRepoUrl}
          />
        </div>

        {/* Right: Pipeline */}
        <div className="p-5 flex flex-col overflow-hidden min-h-0">
          <PipelinePanel
            pipelineState={activeState}
            agentFiles={pipeline.agentFiles.current}
            workspaceId={pipeline.workspaceId.current}
          />
        </div>
      </main>
    </div>
  );
}
