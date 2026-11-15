import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = {
  title: string;
  focus?: string;
  minutes?: number;
  difficulty?: string;
  reason?: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const payload = await getJson<{ suggestions: WorkoutSuggestion[] }>('/api/workouts/suggestions/mona@example.com');
        if (!active) return;
        setSuggestions(payload.suggestions ?? []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load workout suggestions');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, []);

  return <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns."><div>
    {loading && <p role="status">Loading workout suggestions...</p>}
    {!loading && error && <div role="alert" className="alert alert-danger">Unable to load workout suggestions: {error}</div>}
    {!loading && !error && suggestions.length === 0 && <p>No workout suggestions available.</p>}
    {!loading && !error && suggestions.length > 0 && <ul className="list-group">
      {suggestions.map((suggestion) => (
        <li key={`${suggestion.title}-${suggestion.focus ?? 'focus'}`} className="list-group-item">
          <div><strong>{suggestion.title}</strong></div>
          {suggestion.focus ? <div className="small text-muted">Focus: {suggestion.focus}</div> : null}
          {suggestion.minutes ? <div className="small text-muted">{suggestion.minutes} minutes</div> : null}
          {suggestion.reason ? <div className="small">{suggestion.reason}</div> : null}
        </li>
      ))}
    </ul>}
  </div></CapabilityCard>;
}
