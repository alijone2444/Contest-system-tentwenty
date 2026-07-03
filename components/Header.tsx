"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { site } from "@/lib/site";

interface Me {
  user: { id: string; name: string; role: string } | null;
  role: string;
}

export default function Header() {
  const [me, setMe] = useState<Me | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => setMe(j.data))
      .catch(() => setMe({ user: null, role: "GUEST" }));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe({ user: null, role: "GUEST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="site-header">
      <div className="inner">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF, next/image would freeze it */}
          <img src="/logo.gif" alt="tentwenty logo" className="brand-logo" />
          {site.name}
        </Link>
        <nav className="nav">
          <Link href="/">Contests</Link>
          {me?.user && <Link href="/history">My History</Link>}
        </nav>
        <div className="spacer" />
        <nav className="nav">
          <a className="icon-link" href={site.github} target="_blank" rel="noopener noreferrer" title="GitHub repository">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            GitHub
          </a>
          <a className="icon-link" href={`mailto:${site.email}`} title={site.email}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z" />
            </svg>
            Email
          </a>
          {me?.user ? (
            <>
              <span className={`badge ${me.user.role === "VIP" ? "vip" : ""}`}>
                {me.user.name} · {me.user.role}
              </span>
              <button className="secondary" onClick={logout}>
                Logout
              </button>
            </>
          ) : me ? (
            <>
              <Link href="/login">Login</Link>
              <Link className="btn" href="/signup">
                Sign up
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
