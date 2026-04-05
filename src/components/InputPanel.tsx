import Button from '@ingka/button';
import InputField from '@ingka/input-field';
import TextArea from '@ingka/text-area';
import { FileTree } from './FileTree';
import type { AgentFile } from '../hooks/usePipeline';
import type { PipelineState } from '../types';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onRun: () => void;
  onReset: () => void;
  onEnterReplay: () => void;
  isRunning: boolean;
  isComplete: boolean;
  patToken: string;
  onPatTokenChange: (val: string) => void;
  repoUrl: string;
  onRepoUrlChange: (val: string) => void;
  agentFiles: AgentFile[];
  workspaceId: string | null;
  pipelineState: PipelineState;
}

export function InputPanel({
  value, onChange, onRun, onReset, onEnterReplay,
  isRunning, isComplete,
  patToken, onPatTokenChange, repoUrl, onRepoUrlChange,
  agentFiles, workspaceId, pipelineState
}: Props) {
  // Show file tree when Stage 2 or Stage 3 (Infra gen) is running or complete
  const stage2Status = pipelineState.stages[2].status;
  const stage3Status = pipelineState.stages[3].status;
  const showFileTree =
    stage2Status === 'running' || stage2Status === 'complete' ||
    stage3Status === 'running' || stage3Status === 'complete';

  return (
    <div className="flex flex-col h-full gap-4 min-h-0 overflow-y-auto">
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-medium text-skapa-text-1">Describe your application</h2>
        <span className="text-xs text-skapa-text-3">AI generates the PRD &amp; Architecture</span>
      </div>

      <div className="flex-shrink-0">
        <TextArea
          id="app-description"
          label="Application prompt"
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={isRunning}
          placeholder="Describe the application you want to build. For example: Build a task management app with user auth, project boards, task assignments, and real-time notifications..."
          className="[&_textarea]:min-h-[180px] [&_textarea]:max-h-[240px] [&_textarea]:resize-none [&_textarea]:text-xs"
        />
      </div>

      {/* File tree — appears below TextArea once codegen starts */}
      <FileTree files={agentFiles} isVisible={showFileTree} workspaceId={workspaceId} />

      {/* GitHub Push configuration */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        <span className="text-[10px] text-skapa-text-3 uppercase tracking-wider">
          GitHub Push (Stage 4)
        </span>
        <InputField
          id="repo-url"
          type="text"
          label="Repository"
          value={repoUrl}
          onChange={e => onRepoUrlChange(e.target.value)}
          disabled={isRunning}
          placeholder="owner/repo or https://github.com/owner/repo"
        />
        <InputField
          id="pat-token"
          type="password"
          label="GitHub PAT"
          value={patToken}
          onChange={e => onPatTokenChange(e.target.value)}
          disabled={isRunning}
          placeholder="ghp_..."
        />
        {!patToken && !repoUrl && (
          <span className="text-[9px] text-skapa-text-4">
            Optional — leave empty to skip git push
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 flex-shrink-0">
        {!isRunning && !isComplete && (
          <Button
            type="primary"
            text="Run Pipeline"
            onClick={onRun}
            disabled={!value.trim()}
            fluid
          />
        )}

        {isRunning && (
          <Button
            type="secondary"
            text="Abort"
            onClick={onReset}
            fluid
          />
        )}

        {isComplete && (
          <Button
            type="secondary"
            text="Reset"
            onClick={onReset}
            fluid
          />
        )}

        <Button
          type="tertiary"
          text="Replay mode (offline fallback)"
          onClick={onEnterReplay}
          size="small"
          fluid
        />
      </div>
    </div>
  );
}
