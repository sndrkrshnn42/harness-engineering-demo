'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { PipelineState, STAGE_DEFINITIONS } from '../types';

interface Props {
  pipelineState: PipelineState;
}

interface ChartDatum {
  name: string;
  seconds: number;
  tokens: number;
  stageId: number;
}

/** Stage accent colors — violet gradient for visual rhythm. */
const STAGE_COLORS = [
  '#8b5cf6', // violet-500
  '#7c3aed', // violet-600
  '#a78bfa', // violet-400
  '#6d28d9', // violet-700
  '#c4b5fd', // violet-300
  '#5b21b6', // violet-800
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
}

function ChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 font-mono text-xs shadow-lg">
      <p className="text-white font-semibold mb-1">{data.name}</p>
      <p className="text-zinc-400">
        Time: <span className="text-violet-400">{data.seconds.toFixed(1)}s</span>
      </p>
      <p className="text-zinc-400">
        Tokens: <span className="text-violet-400">~{data.tokens.toLocaleString()}</span>
      </p>
    </div>
  );
}

/**
 * Horizontal bar chart showing per-stage elapsed time.
 * Displayed in the pipeline panel after pipeline completion.
 */
export function PipelineChart({ pipelineState }: Props) {
  const data: ChartDatum[] = STAGE_DEFINITIONS.map((def, idx) => {
    const stage = pipelineState.stages[def.id];
    const elapsedMs = stage.elapsedMs ?? 0;
    const outputLen = stage.output.length;

    return {
      name: `S${def.id}`,
      seconds: elapsedMs / 1000,
      tokens: Math.round(outputLen / 4),
      stageId: idx,
    };
  });

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-950 px-4 py-3 mt-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
          Stage Performance
        </span>
        <span className="text-[10px] font-mono text-zinc-600">
          elapsed time (seconds)
        </span>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          data={data}
          layout="horizontal"
          margin={{ top: 0, right: 8, left: -16, bottom: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgb(39 39 42)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: 'rgb(113 113 122)', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: 'rgb(39 39 42)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgb(113 113 122)', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: 'rgb(39 39 42)' }}
            tickLine={false}
            width={32}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: 'rgba(139, 92, 246, 0.08)' }}
          />
          <Bar dataKey="seconds" radius={[3, 3, 0, 0]} maxBarSize={32}>
            {data.map((_, idx) => (
              <Cell
                key={`bar-${idx}`}
                fill={STAGE_COLORS[idx % STAGE_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Stage legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-zinc-800/50">
        {STAGE_DEFINITIONS.map((def, idx) => (
          <div key={def.id} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-sm inline-block"
              style={{ backgroundColor: STAGE_COLORS[idx % STAGE_COLORS.length] }}
            />
            <span className="text-[9px] font-mono text-zinc-600">
              S{def.id}: {def.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
