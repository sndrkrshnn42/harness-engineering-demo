import Status from '@ingka/status';
import Pill from '@ingka/pill';

interface Props {
  totalElapsedMs: number;
}

const ROLES = [
  'BA / Analyst',
  'Solution Architect',
  'Software Developer',
  'Test Engineer',
  'Platform Engineer',
  'DevOps Engineer',
  'Release Engineer / SRE',
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
    <div className="border border-skapa-positive/40 rounded-skapa-m bg-skapa-neutral-1 px-6 py-5 mt-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Status variant="positive" label="Pipeline complete" />
      </div>

      {/* Main verdict */}
      <div className="text-center py-4 border border-skapa-neutral-3 rounded-skapa-m bg-skapa-neutral-2">
        <p className="text-2xl font-bold text-skapa-text-1 tracking-tight">
          7 Tasks completed
        </p>
        <p className="text-skapa-text-2 text-sm mt-1">
          0 human handoffs &middot; {seconds} seconds
        </p>
      </div>

      {/* Timeline comparison */}
      <div className="mt-4 space-y-2">
        <p className="text-[10px] text-skapa-text-3 uppercase tracking-wider mb-2">
          Timeline Comparison
        </p>

        {/* Traditional team bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-skapa-text-3">Traditional Team</span>
            <span className="text-xs text-skapa-text-3">~3 weeks</span>
          </div>
          <div className="w-full h-2 bg-skapa-neutral-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-skapa-neutral-5 rounded-full transition-all duration-1000 ease-out"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* AI pipeline bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--skapa-positive)' }}>AI Pipeline</span>
            <span className="text-xs" style={{ color: 'var(--skapa-positive)' }}>{seconds}s</span>
          </div>
          <div className="w-full h-2 bg-skapa-neutral-3 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                backgroundColor: 'var(--skapa-positive)',
                width: `${Math.max(2, (totalElapsedMs / (TRADITIONAL_HOURS * 3600 * 1000)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Speedup factor */}
        <div className="text-center mt-2">
          <span className="text-xs text-skapa-text-3">
            {speedup.toLocaleString()}x faster
          </span>
        </div>
      </div>

      {/* Roles displaced */}
      <div className="mt-4 pt-3 border-t border-skapa-neutral-3">
        <p className="text-[10px] text-skapa-text-3 uppercase tracking-wider mb-2">
          Roles Automated
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ROLES.map(role => (
            <Pill
              key={role}
              label={role}
              size="xsmall"
              className="line-through opacity-60"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
