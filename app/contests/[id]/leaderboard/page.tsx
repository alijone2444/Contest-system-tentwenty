"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { api } from "@/lib/client";

interface Entry {
  rank: number;
  name: string;
  role: string;
  score: number;
  submittedAt: string;
  isYou: boolean;
}
interface Data {
  contest: { id: string; name: string; prize: string; finalized: boolean };
  leaderboard: Entry[];
}

export default function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Data>(`/api/contests/${id}/leaderboard`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="error-box">{error}</div>;
  if (!data) return <p className="muted">Loading leaderboard…</p>;

  return (
    <>
      <h1>Leaderboard — {data.contest.name}</h1>
      <p className="page-sub">
        🎁 Prize: {data.contest.prize}
        {data.contest.finalized && " · Contest finalized, prize awarded to the winner."}
        {" · "}
        <Link href={`/contests/${id}`}>← Back to contest</Link>
      </p>

      {data.leaderboard.length === 0 ? (
        <p className="muted">No submissions yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Role</th>
              <th>Score</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {data.leaderboard.map((e) => (
              <tr key={e.rank} className={e.isYou ? "you" : ""}>
                <td>{e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : e.rank}</td>
                <td>
                  {e.name} {e.isYou && <span className="badge">you</span>}
                </td>
                <td>{e.role}</td>
                <td>{e.score}</td>
                <td className="muted">{new Date(e.submittedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
