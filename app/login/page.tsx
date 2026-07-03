"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      window.location.href = "/"; // full reload so the header picks up the session
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="card auth-card">
      <h1>Login</h1>
      <p className="page-sub">Welcome back!</p>
      {error && <div className="error-box">{error}</div>}
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={busy}>
          {busy ? "Logging in…" : "Login"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 14 }}>
        No account? <Link href="/signup">Sign up</Link>
      </p>
    </div>
  );
}
