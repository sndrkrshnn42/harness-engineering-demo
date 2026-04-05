'use client';

import { useState, useCallback, useMemo } from 'react';
import { usePipeline } from './hooks/usePipeline';
import { useReplay } from './hooks/useReplay';
import { DEFAULT_PROMPT } from './constants/defaultPrompt';
import { InputPanel } from './components/InputPanel';
import { PipelinePanel } from './components/PipelinePanel';
import { STAGE_DEFINITIONS } from './types';
import Status from '@ingka/status';
import Pill from '@ingka/pill';


export default function App() {
  const [inputSpec, setInputSpec] = useState(DEFAULT_PROMPT);
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [patToken, setPatToken] = useState('');
  const [repoUrl, setRepoUrl] = useState('');

  const pipeline = usePipeline(inputSpec, 'opencode', patToken, repoUrl);
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

  // Status line text
  const statusLine = useMemo(() => {
    if (activeState.status === 'idle') return 'Idle';
    if (activeState.status === 'complete') return 'Complete';
    if (activeState.status === 'error') return 'Error';
    if (activeState.currentStage) {
      const def = STAGE_DEFINITIONS.find(d => d.id === activeState.currentStage);
      return `Stage ${activeState.currentStage}/${STAGE_DEFINITIONS.length}${def ? ` \u2014 ${def.name}` : ''}`;
    }
    return 'Running';
  }, [activeState.status, activeState.currentStage]);

  // Map pipeline status to Skapa Status variant
  const statusVariant = useMemo(() => {
    if (activeState.status === 'running') return 'informative' as const;
    if (activeState.status === 'complete') return 'positive' as const;
    if (activeState.status === 'error') return 'negative' as const;
    return 'indeterminate' as const;
  }, [activeState.status]);

  return (
    <div className="min-h-screen bg-skapa-neutral-1 text-skapa-text-1">
      {/* Top bar — INGKA branded header */}
      <header className="border-b border-skapa-brand-blue bg-skapa-brand-blue">
        <div className="px-6 py-3 flex items-center justify-between">
          {/* Left: INGKA branding */}
          <div className="flex items-center gap-3">
            {/* IKEA logo */}
            <img src="/ikea-logo.svg" alt="IKEA" className="h-8 w-auto" />
            <span className="text-base font-bold tracking-tight" style={{ color: 'var(--skapa-brand-yellow)' }}>
              Harness Engineering
            </span>
            {isReplayMode && (
              <Pill label="REPLAY" size="xsmall" selected />
            )}
          </div>

          {/* Right: pipeline status */}
          <div className="flex items-center gap-3" style={{ color: 'var(--skapa-brand-yellow)' }}>
            <Status variant={statusVariant} small label={statusLine} />
          </div>
        </div>
      </header>

      {/* Main content — two-panel layout */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-[calc(100vh-53px)]">
        {/* Left: Input */}
        <div className="border-r border-skapa-neutral-3 p-5 flex flex-col min-h-0">
          <InputPanel
            value={inputSpec}
            onChange={setInputSpec}
            onRun={handleRun}
            onReset={handleReset}
            onEnterReplay={handleEnterReplay}
            isRunning={isRunning}
            isComplete={isComplete}
            patToken={patToken}
            onPatTokenChange={setPatToken}
            repoUrl={repoUrl}
            onRepoUrlChange={setRepoUrl}
            agentFiles={pipeline.agentFiles.current}
            workspaceId={pipeline.workspaceId.current}
            pipelineState={activeState}
          />
        </div>

        {/* Right: Pipeline */}
        <div className="p-5 flex flex-col overflow-hidden min-h-0">
          <PipelinePanel
            pipelineState={activeState}
          />
        </div>
      </main>
    </div>
  );
}
