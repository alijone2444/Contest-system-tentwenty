"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

interface ContestItem {
  id: string;
  name: string;
  description: string;
  accessLevel: "NORMAL" | "VIP";
  startTime: string;
  endTime: string;
  prize: string;
  status: "UPCOMING" | "ACTIVE" | "ENDED";
  canParticipate: boolean;
  questionCount: number;
  participantCount: number;
}

export default function HomePage() {
  const [contests, setContests] = useState<ContestItem[] | null>(null);
  const [role, setRole] = useState("GUEST");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ role: string; contests: ContestItem[] }>("/api/contests")
      .then((d) => {
        setContests(d.contests);
        setRole(d.role);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <h1>Contests</h1>
      <p className="page-sub">
        {role === "GUEST"
          ? "You are browsing as a guest — sign up to participate in contests."
          : `Logged in as ${role}. ${role === "USER" ? "VIP contests require a VIP account." : "You can access all contests."}`}
      </p>

      {error && <div className="error-box">{error}</div>}
      {!contests && !error && <p className="muted">Loading contests…</p>}
      {contests?.length === 0 && <p className="muted">No contests yet.</p>}

      {contests?.map((c) => (
        <div className="card" key={c.id}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3>
              <Link href={`/contests/${c.id}`}>{c.name}</Link>
            </h3>
            <div className="row">
              {c.accessLevel === "VIP" && <span className="badge vip">VIP</span>}
              <span className={`badge ${c.status.toLowerCase()}`}>{c.status}</span>
            </div>
          </div>
          <p className="muted">{c.description}</p>
          <p className="muted" style={{ marginTop: 8 }}>
            🎁 {c.prize} · {c.questionCount} questions · {c.participantCount} participants
          </p>
          <p className="muted">
            {new Date(c.startTime).toLocaleString()} → {new Date(c.endTime).toLocaleString()}
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            <Link className="btn" href={`/contests/${c.id}`}>
              {c.canParticipate ? "Participate" : "View"}
            </Link>
            <Link href={`/contests/${c.id}/leaderboard`}>Leaderboard →</Link>
          </div>
        </div>
      ))}
    </>
  );
}
