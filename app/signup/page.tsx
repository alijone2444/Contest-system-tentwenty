"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="card auth-card">
      <h1>Sign up</h1>
      <p className="page-sub">Create an account to participate in contests.</p>
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={onSubmit}>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password (min 6 characters)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button type="submit" disabled={busy}>
          {busy ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 14 }}>
        Already have an account? <Link href="/login">Login</Link>
      </p>
    </div>
  );
}
