import { useEffect, useState } from 'react';

interface Props {
  startedAt: number | null;
  stoppedAt: number | null;
}

export function ElapsedTimer({ startedAt, stoppedAt }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) { setElapsed(0); return; }
    if (stoppedAt) { setElapsed(stoppedAt); return; }

    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);
    return () => clearInterval(interval);
  }, [startedAt, stoppedAt]);

  const seconds = (elapsed / 1000).toFixed(1);

  return (
    <span className="font-mono text-sm text-zinc-400">
      {startedAt ? `${seconds}s` : '0.0s'}
    </span>
  );
}
