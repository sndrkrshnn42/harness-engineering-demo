import type { CodegenMode } from '../types';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onRun: () => void;
  onReset: () => void;
  onEnterReplay: () => void;
  isRunning: boolean;
  isComplete: boolean;
  codegenMode: CodegenMode;
  onCodegenModeChange: (mode: CodegenMode) => void;
  patToken: string;
  onPatTokenChange: (val: string) => void;
  repoUrl: string;
  onRepoUrlChange: (val: string) => void;
}

export function InputPanel({
  value, onChange, onRun, onReset, onEnterReplay,
  isRunning, isComplete, codegenMode, onCodegenModeChange,
  patToken, onPatTokenChange, repoUrl, onRepoUrlChange
}: Props) {
  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">Service specification</h2>
        <span className="text-xs text-zinc-600">Paste any API spec</span>
      </div>

      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={isRunning}
        className={`
          flex-1 w-full font-mono text-xs leading-relaxed
          bg-zinc-950 border border-zinc-800 rounded-lg
          p-3 resize-none text-zinc-300
          focus:outline-none focus:border-zinc-600
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        spellCheck={false}
        placeholder="Paste your service specification here..."
      />

      {/* Codegen engine toggle */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
          Codegen
        </span>
        <div className="flex rounded-lg overflow-hidden border border-zinc-800">
          <button
            onClick={() => onCodegenModeChange('qwen')}
            disabled={isRunning}
            className={`
              px-3 py-1 text-xs font-mono transition-colors duration-150
              disabled:cursor-not-allowed
              ${codegenMode === 'qwen'
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              }
            `}
          >
            Qwen
          </button>
          <button
            onClick={() => onCodegenModeChange('opencode')}
            disabled={isRunning}
            className={`
              px-3 py-1 text-xs font-mono transition-colors duration-150
              disabled:cursor-not-allowed
              ${codegenMode === 'opencode'
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              }
            `}
          >
            OpenCode
          </button>
        </div>
      </div>

      {/* GitHub Push configuration */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
          GitHub Push (Stage 4)
        </span>
        <input
          type="text"
          value={repoUrl}
          onChange={e => onRepoUrlChange(e.target.value)}
          disabled={isRunning}
          placeholder="owner/repo or https://github.com/owner/repo"
          className="
            w-full font-mono text-xs
            bg-zinc-950 border border-zinc-800 rounded-lg
            px-3 py-1.5 text-zinc-300
            placeholder:text-zinc-700
            focus:outline-none focus:border-zinc-600
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        />
        <input
          type="password"
          value={patToken}
          onChange={e => onPatTokenChange(e.target.value)}
          disabled={isRunning}
          placeholder="GitHub PAT (ghp_...)"
          className="
            w-full font-mono text-xs
            bg-zinc-950 border border-zinc-800 rounded-lg
            px-3 py-1.5 text-zinc-300
            placeholder:text-zinc-700
            focus:outline-none focus:border-zinc-600
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        />
        {!patToken && !repoUrl && (
          <span className="text-[9px] text-zinc-700 font-mono">
            Optional — leave empty to skip git push
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {!isRunning && !isComplete && (
          <button
            onClick={onRun}
            disabled={!value.trim()}
            className="
              w-full py-2.5 px-4 rounded-lg font-medium text-sm
              bg-violet-600 hover:bg-violet-500 active:bg-violet-700
              text-white transition-colors duration-150
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            Run Pipeline
          </button>
        )}

        {isRunning && (
          <button
            onClick={onReset}
            className="
              w-full py-2.5 px-4 rounded-lg font-medium text-sm
              border border-zinc-700 hover:border-zinc-500
              text-zinc-400 hover:text-zinc-200 transition-colors duration-150
            "
          >
            Abort
          </button>
        )}

        {isComplete && (
          <button
            onClick={onReset}
            className="
              w-full py-2.5 px-4 rounded-lg font-medium text-sm
              border border-zinc-700 hover:border-zinc-500
              text-zinc-400 hover:text-zinc-200 transition-colors duration-150
            "
          >
            Reset
          </button>
        )}

        <button
          onClick={onEnterReplay}
          className="
            w-full py-1.5 px-4 rounded-lg text-xs
            border border-zinc-800 hover:border-zinc-700
            text-zinc-600 hover:text-zinc-400 transition-colors duration-150
          "
        >
          Replay mode (offline fallback)
        </button>
      </div>
    </div>
  );
}
