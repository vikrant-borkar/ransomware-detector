"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { syncPendingScans } from "@/lib/history";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "Security Analyst" | "SOC Operator" | "Threat Researcher";
  avatar: string;
  token?: string;
};

const STORAGE_KEY = "brd_auth_user";

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  if (typeof window === "undefined") return;
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
  window.dispatchEvent(new Event("auth_change"));
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    setLoaded(true);

    if (stored?.email) {
      void syncPendingScans(stored.email);
    }

    function handleAuthChange() {
      const u = getStoredUser();
      setUser(u);
      if (u?.email) {
        void syncPendingScans(u.email);
      }
    }

    window.addEventListener("auth_change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  async function login(email: string, password: string): Promise<User> {
    const res = await api<{ ok: boolean; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (!res.ok || !res.user) {
      throw new Error("Failed to authenticate.");
    }
    setStoredUser(res.user);
    await syncPendingScans(res.user.email);
    return res.user;
  }

  async function signup(
    email: string,
    password: string,
    name?: string,
    role?: User["role"]
  ): Promise<User> {
    const res = await api<{ ok: boolean; user: User }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim(),
        password,
        name: name?.trim() || "",
        role: role || "Security Analyst",
      }),
    });
    if (!res.ok || !res.user) {
      throw new Error("Failed to create account.");
    }
    setStoredUser(res.user);
    await syncPendingScans(res.user.email);
    return res.user;
  }

  function logout(): void {
    setStoredUser(null);
  }

  return {
    user,
    loaded,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
  };
}
