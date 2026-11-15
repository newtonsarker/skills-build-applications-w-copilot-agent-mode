import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type TeamRecord = {
  _id?: string;
  name: string;
  mascot?: string;
  members?: Array<string | { _id?: string; name?: string }>;
};

export default function Teams() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const payload = await getJson<{ teams: TeamRecord[] }>('/api/teams');
        if (!active) return;
        setTeams(payload.teams ?? []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load teams');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, []);

  return <CapabilityCard title="Teams" description="Manage teams and members."><div>
    {loading && <p role="status">Loading teams...</p>}
    {!loading && error && <div role="alert" className="alert alert-danger">Unable to load teams: {error}</div>}
    {!loading && !error && teams.length === 0 && <p>No teams yet.</p>}
    {!loading && !error && teams.length > 0 && <ul className="list-group">
      {teams.map((team) => (
        <li key={team._id ?? team.name} className="list-group-item">
          <strong>{team.name}</strong>
          {team.mascot ? <span className="badge bg-light text-dark ms-2">{team.mascot}</span> : null}
          <div className="small text-muted">{team.members?.length ?? 0} members</div>
        </li>
      ))}
    </ul>}
  </div></CapabilityCard>;
}
