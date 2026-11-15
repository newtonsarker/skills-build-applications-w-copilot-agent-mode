import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = {
  teamName: string;
  totalPoints: number;
  rank: number;
};

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const payload = await getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard');
        if (!active) return;
        setEntries(payload.leaderboard ?? []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load leaderboard');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, []);

  return <CapabilityCard title="Leaderboard" description="Compare team point totals."><div>
    {loading && <p role="status">Loading leaderboard...</p>}
    {!loading && error && <div role="alert" className="alert alert-danger">Unable to load leaderboard: {error}</div>}
    {!loading && !error && entries.length === 0 && <p>No leaderboard rankings yet.</p>}
    {!loading && !error && entries.length > 0 && <ol className="list-group list-group-numbered">
      {entries.map((entry) => (
        <li key={`${entry.teamName}-${entry.rank}`} className="list-group-item d-flex justify-content-between align-items-center">
          <span>{entry.rank}. {entry.teamName}</span>
          <span className="badge bg-primary rounded-pill">{entry.totalPoints}</span>
        </li>
      ))}
    </ol>}
  </div></CapabilityCard>;
}
