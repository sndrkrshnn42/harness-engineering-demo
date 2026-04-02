interface Props {
  totalElapsedMs: number;
}

const ROLES = [
  'BA / Analyst',
  'Software Developer',
  'Test Engineer',
  'Platform Engineer',
  'DevOps Engineer',
  'Support Engineer',
  'Tech Lead',
];

/** Traditional team timeline (rough estimate): 3 weeks in working hours. */
const TRADITIONAL_HOURS = 3 * 5 * 8; // 3 weeks * 5 days * 8 hours = 120 hours

export function VerdictCard({ totalElapsedMs }: Props) {
  const seconds = (totalElapsedMs / 1000).toFixed(1);

  // Calculate speedup factor
  const aiHours = totalElapsedMs / (1000 * 60 * 60);
  const speedup = Math.round(TRADITIONAL_HOURS / aiHours);

  return (
    <div className="border border-emerald-700/40 rounded-lg bg-emerald-950/20 px-6 py-5 mt-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-emerald-400 text-lg">&#10003;</span>
        <span className="text-emerald-400 font-medium text-sm">Pipeline complete</span>
      </div>

      {/* Main verdict */}
      <div className="font-mono text-center py-4 border border-emerald-900/40 rounded bg-black/40">
        <p className="text-2xl font-bold text-white tracking-tight">
          6 Tasks completed
        </p>
        <p className="text-zinc-400 text-sm mt-1">
          0 human handoffs &middot; {seconds} seconds
        </p>
      </div>

      {/* Timeline comparison */}
      <div className="mt-4 space-y-2">
        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">
          Timeline Comparison
        </p>

        {/* Traditional team bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-500">Traditional Team</span>
            <span className="text-xs font-mono text-zinc-500">~3 weeks</span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-600 rounded-full transition-all duration-1000 ease-out"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* AI pipeline bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-400">AI Pipeline</span>
            <span className="text-xs font-mono text-emerald-400">{seconds}s</span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
              style={{
                // Proportional width: AI time vs 3 weeks, with minimum visibility of 2%
                width: `${Math.max(2, (totalElapsedMs / (TRADITIONAL_HOURS * 3600 * 1000)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Speedup factor */}
        <div className="text-center mt-2">
          <span className="text-xs font-mono text-zinc-600">
            {speedup.toLocaleString()}x faster
          </span>
        </div>
      </div>

      {/* Roles displaced */}
      <div className="mt-4 pt-3 border-t border-emerald-900/30">
        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">
          Roles Automated
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ROLES.map(role => (
            <span
              key={role}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-500 bg-zinc-900/50 line-through"
            >
              {role}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
