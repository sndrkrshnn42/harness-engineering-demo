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

/** Stage accent colors -- IKEA blue palette. */
const STAGE_COLORS = [
  '#0058A3', // IKEA brand blue
  '#004F93', // darker blue
  '#0077C2', // lighter blue
  '#003E75', // deep blue
  '#489CE3', // sky blue
  '#1A6DB5', // medium blue
  '#0068B8', // rich blue
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
}

function ChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-skapa-neutral-1 border border-skapa-neutral-3 rounded-skapa-s px-3 py-2 text-xs shadow-lg">
      <p className="text-skapa-text-1 font-semibold mb-1">{data.name}</p>
      <p className="text-skapa-text-2">
        Time: <span style={{ color: 'var(--skapa-brand-blue)' }}>{data.seconds.toFixed(1)}s</span>
      </p>
      <p className="text-skapa-text-2">
        Tokens: <span style={{ color: 'var(--skapa-brand-blue)' }}>~{data.tokens.toLocaleString()}</span>
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
    <div className="border border-skapa-neutral-3 rounded-skapa-m bg-skapa-neutral-1 px-4 py-3 mt-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-skapa-text-3 uppercase tracking-wider">
          Stage Performance
        </span>
        <span className="text-[10px] text-skapa-text-3">
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
            stroke="rgb(223 223 223)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: 'rgb(118 118 118)', fontSize: 10 }}
            axisLine={{ stroke: 'rgb(223 223 223)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgb(118 118 118)', fontSize: 10 }}
            axisLine={{ stroke: 'rgb(223 223 223)' }}
            tickLine={false}
            width={32}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: 'rgba(0, 88, 163, 0.08)' }}
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
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-skapa-neutral-3">
        {STAGE_DEFINITIONS.map((def, idx) => (
          <div key={def.id} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-sm inline-block"
              style={{ backgroundColor: STAGE_COLORS[idx % STAGE_COLORS.length] }}
            />
            <span className="text-[9px] text-skapa-text-3">
              S{def.id}: {def.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
