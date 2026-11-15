import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type ActivityRecord = {
  _id?: string;
  type: string;
  minutes: number;
  points: number;
  occurredAt?: string;
};

export default function Activities() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const payload = await getJson<{ activities: ActivityRecord[] }>('/api/activities');
        if (!active) return;
        setActivities(payload.activities ?? []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load activities');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, []);

  return <CapabilityCard title="Activities" description="Track student activity minutes and points."><div>
    {loading && <p role="status">Loading activities...</p>}
    {!loading && error && <div role="alert" className="alert alert-danger">Unable to load activities: {error}</div>}
    {!loading && !error && activities.length === 0 && <p>No activities yet.</p>}
    {!loading && !error && activities.length > 0 && <ul className="list-group">
      {activities.map((activity) => (
        <li key={activity._id ?? `${activity.type}-${activity.occurredAt ?? 'unknown'}`} className="list-group-item">
          <strong>{activity.type}</strong> · {activity.minutes} minutes · {activity.points} points
          {activity.occurredAt ? <div className="small text-muted">{new Date(activity.occurredAt).toLocaleString()}</div> : null}
        </li>
      ))}
    </ul>}
  </div></CapabilityCard>;
}
