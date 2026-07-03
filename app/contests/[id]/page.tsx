"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

interface Option {
  id: string;
  text: string;
}
interface Question {
  id: string;
  text: string;
  type: "SINGLE_SELECT" | "MULTI_SELECT" | "TRUE_FALSE";
  points: number;
  options: Option[];
}
interface Detail {
  contest: {
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
  };
  participation: { status: "IN_PROGRESS" | "SUBMITTED"; score: number } | null;
  questions: Question[] | null;
}
interface SubmitResult {
  score: number;
  totalPoints: number;
  correctAnswers: number;
  totalQuestions: number;
}

export default function ContestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);

  const load = useCallback(() => {
    api<Detail>(`/api/contests/${id}`)
      .then(setDetail)
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(load, [load]);

  async function join() {
    setError("");
    setBusy(true);
    try {
      const d = await api<{ message: string }>(`/api/contests/${id}/join`, { method: "POST" });
      setNotice(d.message);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function toggle(q: Question, optionId: string) {
    setSelections((prev) => {
      const current = prev[q.id] ?? [];
      if (q.type === "MULTI_SELECT") {
        return {
          ...prev,
          [q.id]: current.includes(optionId)
            ? current.filter((o) => o !== optionId)
            : [...current, optionId],
        };
      }
      return { ...prev, [q.id]: [optionId] };
    });
  }

  async function submit() {
    if (!detail?.questions) return;
    setError("");
    setBusy(true);
    try {
      const answers = detail.questions
        .filter((q) => (selections[q.id] ?? []).length > 0)
        .map((q) => ({ questionId: q.id, selectedOptionIds: selections[q.id] }));
      if (answers.length === 0) {
        setError("Select at least one answer before submitting.");
        setBusy(false);
        return;
      }
      const r = await api<SubmitResult>(`/api/contests/${id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      setResult(r);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!detail && !error) return <p className="muted">Loading…</p>;
  if (!detail) return <div className="error-box">{error}</div>;

  const { contest, participation, questions } = detail;

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>{contest.name}</h1>
        <div className="row">
          {contest.accessLevel === "VIP" && <span className="badge vip">VIP</span>}
          <span className={`badge ${contest.status.toLowerCase()}`}>{contest.status}</span>
        </div>
      </div>
      <p className="page-sub">{contest.description}</p>

      <div className="card">
        <p>🎁 Prize: <strong>{contest.prize}</strong></p>
        <p className="muted">
          {new Date(contest.startTime).toLocaleString()} → {new Date(contest.endTime).toLocaleString()}
          {" · "}
          {contest.questionCount} questions · {contest.participantCount} participants
        </p>
        <p style={{ marginTop: 8 }}>
          <Link href={`/contests/${id}/leaderboard`}>View leaderboard →</Link>
        </p>
      </div>

      {error && <div className="error-box">{error}</div>}
      {notice && !result && <div className="success-box">{notice}</div>}

      {result && (
        <div className="success-box">
          🎉 Submitted! Score: <strong>{result.score} / {result.totalPoints}</strong>{" "}
          ({result.correctAnswers} of {result.totalQuestions} correct)
        </div>
      )}

      {participation?.status === "SUBMITTED" && !result && (
        <div className="success-box">
          ✅ You already submitted this contest. Score: <strong>{participation.score}</strong>
        </div>
      )}

      {!participation && contest.canParticipate && (
        <button onClick={join} disabled={busy}>
          {busy ? "Joining…" : "Join contest"}
        </button>
      )}

      {!contest.canParticipate && contest.status === "ACTIVE" && (
        <div className="card muted">
          To participate, <Link href="/signup">sign up</Link> / <Link href="/login">log in</Link>
          {contest.accessLevel === "VIP" && " with a VIP account"}.
        </div>
      )}

      {participation?.status === "IN_PROGRESS" && questions && (
        <>
          <h2>Questions</h2>
          {questions.map((q, i) => (
            <div className="question" key={q.id}>
              <p style={{ marginBottom: 8 }}>
                <strong>Q{i + 1}.</strong> {q.text}{" "}
                <span className="muted">
                  ({q.type.replace("_", "-").toLowerCase()}, {q.points} pt)
                </span>
              </p>
              {q.options.map((o) => (
                <label className="option" key={o.id}>
                  <input
                    type={q.type === "MULTI_SELECT" ? "checkbox" : "radio"}
                    name={q.id}
                    checked={(selections[q.id] ?? []).includes(o.id)}
                    onChange={() => toggle(q, o.id)}
                  />
                  {o.text}
                </label>
              ))}
            </div>
          ))}
          <button onClick={submit} disabled={busy}>
            {busy ? "Submitting…" : "Submit answers"}
          </button>
        </>
      )}
    </>
  );
}
