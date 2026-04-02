export type StageStatus = 'idle' | 'running' | 'complete' | 'error';

export type StageId = 1 | 2 | 3 | 4 | 5 | 6;

export interface StageDefinition {
  id: StageId;
  name: string;
  roleDisplaced: string;
  expectedOutputLabel: string;
  estimatedSeconds: number;
}

export interface StageState {
  id: StageId;
  status: StageStatus;
  output: string;
  elapsedMs: number | null;
  errorMessage: string | null;
}

export type CodegenMode = 'qwen' | 'opencode';

export type PipelineStatus = 'idle' | 'running' | 'complete' | 'error';

export interface PipelineState {
  status: PipelineStatus;
  stages: Record<StageId, StageState>;
  currentStage: StageId | null;
  startedAt: number | null;
  totalElapsedMs: number | null;
  isReplayMode: boolean;
}

export type PipelineAction =
  | { type: 'START'; timestamp: number }
  | { type: 'STAGE_START'; stageId: StageId }
  | { type: 'STAGE_APPEND'; stageId: StageId; text: string }
  | { type: 'STAGE_COMPLETE'; stageId: StageId; elapsedMs: number }
  | { type: 'STAGE_ERROR'; stageId: StageId; message: string }
  | { type: 'PIPELINE_COMPLETE'; totalElapsedMs: number }
  | { type: 'RESET' }
  | { type: 'ENTER_REPLAY_MODE' };

export const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    id: 1,
    name: 'Spec ingestion',
    roleDisplaced: 'BA / Analyst',
    expectedOutputLabel: 'Structured requirement breakdown',
    estimatedSeconds: 8,
  },
  {
    id: 2,
    name: 'Code generation',
    roleDisplaced: 'Software Developer + Test Engineer',
    expectedOutputLabel: 'Application code + pytest test suite',
    estimatedSeconds: 15,
  },
  {
    id: 3,
    name: 'Infra generation',
    roleDisplaced: 'Platform Engineer',
    expectedOutputLabel: 'Helm chart + Kubernetes manifests',
    estimatedSeconds: 10,
  },
  {
    id: 4,
    name: 'Push to Git',
    roleDisplaced: 'DevOps Engineer',
    expectedOutputLabel: 'Git commit + push to remote',
    estimatedSeconds: 8,
  },
  {
    id: 5,
    name: 'Defect triage',
    roleDisplaced: 'Support Engineer',
    expectedOutputLabel: 'Root cause + remediation',
    estimatedSeconds: 7,
  },
  {
    id: 6,
    name: 'Report synthesis',
    roleDisplaced: 'Tech Lead',
    expectedOutputLabel: 'Verdict card + impact summary',
    estimatedSeconds: 5,
  },
];

export function createInitialState(): PipelineState {
  const stages = {} as Record<StageId, StageState>;
  for (const def of STAGE_DEFINITIONS) {
    stages[def.id] = {
      id: def.id,
      status: 'idle',
      output: '',
      elapsedMs: null,
      errorMessage: null,
    };
  }
  return {
    status: 'idle',
    stages,
    currentStage: null,
    startedAt: null,
    totalElapsedMs: null,
    isReplayMode: false,
  };
}

export function pipelineReducer(
  state: PipelineState,
  action: PipelineAction
): PipelineState {
  switch (action.type) {
    case 'START':
      return { ...state, status: 'running', startedAt: action.timestamp, currentStage: null };

    case 'STAGE_START':
      return {
        ...state,
        currentStage: action.stageId,
        stages: {
          ...state.stages,
          [action.stageId]: { ...state.stages[action.stageId], status: 'running', output: '' },
        },
      };

    case 'STAGE_APPEND':
      return {
        ...state,
        stages: {
          ...state.stages,
          [action.stageId]: {
            ...state.stages[action.stageId],
            output: state.stages[action.stageId].output + action.text,
          },
        },
      };

    case 'STAGE_COMPLETE':
      return {
        ...state,
        stages: {
          ...state.stages,
          [action.stageId]: {
            ...state.stages[action.stageId],
            status: 'complete',
            elapsedMs: action.elapsedMs,
          },
        },
      };

    case 'STAGE_ERROR':
      return {
        ...state,
        status: 'error',
        stages: {
          ...state.stages,
          [action.stageId]: {
            ...state.stages[action.stageId],
            status: 'error',
            errorMessage: action.message,
          },
        },
      };

    case 'PIPELINE_COMPLETE':
      return { ...state, status: 'complete', totalElapsedMs: action.totalElapsedMs, currentStage: null };

    case 'RESET':
      return createInitialState();

    case 'ENTER_REPLAY_MODE':
      return { ...state, isReplayMode: true };

    default:
      return state;
  }
}
