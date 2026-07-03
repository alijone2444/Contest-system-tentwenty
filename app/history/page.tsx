"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

interface HistoryItem {
  contest: { id: string; name: string; accessLevel: string; prize: string; finalized: boolean };
  score: number;
  submittedAt: string;
  prizeWon: string | null;
}
interface InProgressItem {
  contest: { id: string; name: string; accessLevel: string; endTime: string };
  startedAt: string;
  expired: boolean;
}
interface PrizeItem {
  id: string;
  prizeName: string;
  score: number;
  awardedAt: string;
  contest: { id: string; name: string };
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [inProgress, setInProgress] = useState<InProgressItem[] | null>(null);
  const [prizes, setPrizes] = useState<PrizeItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<{ history: HistoryItem[] }>("/api/me/history"),
      api<{ inProgress: InProgressItem[] }>("/api/me/in-progress"),
      api<{ prizes: PrizeItem[] }>("/api/me/prizes"),
    ])
      .then(([h, i, p]) => {
        setHistory(h.history);
        setInProgress(i.inProgress);
        setPrizes(p.prizes);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error)
    return (
      <div className="error-box">
        {error} — <Link href="/login">Login</Link> to view your history.
      </div>
    );
  if (!history) return <p className="muted">Loading your history…</p>;

  return (
    <>
      <h1>My History</h1>
      <p className="page-sub">Your contests, in-progress attempts, and prizes.</p>

      <h2>🏅 Prizes won ({prizes?.length ?? 0})</h2>
      {prizes?.length === 0 && <p className="muted">No prizes yet — keep competing!</p>}
      {prizes?.map((p) => (
        <div className="card" key={p.id}>
          <h3>{p.prizeName}</h3>
          <p className="muted">
            Won in <Link href={`/contests/${p.contest.id}`}>{p.contest.name}</Link> with score{" "}
            {p.score} · {new Date(p.awardedAt).toLocaleString()}
          </p>
        </div>
      ))}

      <h2>⏳ In progress ({inProgress?.length ?? 0})</h2>
      {inProgress?.length === 0 && <p className="muted">No contests in progress.</p>}
      {inProgress?.map((i) => (
        <div className="card" key={i.contest.id}>
          <h3>
            <Link href={`/contests/${i.contest.id}`}>{i.contest.name}</Link>
          </h3>
          <p className="muted">
            Joined {new Date(i.startedAt).toLocaleString()} ·{" "}
            {i.expired
              ? "⚠️ contest ended before you submitted"
              : `submit before ${new Date(i.contest.endTime).toLocaleString()}`}
          </p>
        </div>
      ))}

      <h2>📜 Completed contests ({history.length})</h2>
      {history.length === 0 && <p className="muted">You haven't completed any contest yet.</p>}
      {history.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Contest</th>
              <th>Score</th>
              <th>Submitted</th>
              <th>Prize</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.contest.id}>
                <td>
                  <Link href={`/contests/${h.contest.id}`}>{h.contest.name}</Link>{" "}
                  {h.contest.accessLevel === "VIP" && <span className="badge vip">VIP</span>}
                </td>
                <td>{h.score}</td>
                <td className="muted">{new Date(h.submittedAt).toLocaleString()}</td>
                <td>{h.prizeWon ? `🏆 ${h.prizeWon}` : h.contest.finalized ? "—" : "pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
