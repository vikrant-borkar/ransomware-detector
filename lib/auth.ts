"use client";

import { useEffect, useState } from "react";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "Security Analyst" | "SOC Operator" | "Threat Researcher";
  avatar: string;
  token: string;
};

const STORAGE_KEY = "brd_auth_user";

export const DEMO_USERS: User[] = [
  {
    id: "usr_analyst",
    name: "Vikrant Borkar",
    email: "analyst@ghrce.edu",
    role: "Security Analyst",
    avatar: "VB",
    token: "demo_token_analyst_2026",
  },
  {
    id: "usr_lead",
    name: "Group 5 Lead",
    email: "group5@ghrce.edu",
    role: "SOC Operator",
    avatar: "G5",
    token: "demo_token_group5_2026",
  },
];

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
    setUser(getStoredUser());
    setLoaded(true);

    function handleAuthChange() {
      setUser(getStoredUser());
    }

    window.addEventListener("auth_change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  function login(email: string, name?: string, role?: User["role"]): User {
    const existing = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const finalUser: User = existing || {
      id: `usr_${Date.now()}`,
      name: name || email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      email,
      role: role || "Security Analyst",
      avatar: (name || email).slice(0, 2).toUpperCase(),
      token: `token_${Date.now()}`,
    };
    setStoredUser(finalUser);
    return finalUser;
  }

  function loginAsDemo(index = 0): User {
    const demo = DEMO_USERS[index] || DEMO_USERS[0];
    setStoredUser(demo);
    return demo;
  }

  function logout(): void {
    setStoredUser(null);
  }

  return {
    user,
    loaded,
    isAuthenticated: !!user,
    login,
    loginAsDemo,
    logout,
  };
}
