// src/hooks/useAuth.js
//
// Hook pour gérer l'état d'authentification de l'utilisateur.
// Utilise credentials: "include" pour envoyer le cookie de session Rails.
//
import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Au chargement, vérifie si l'utilisateur est déjà connecté (cookie existant)
  useEffect(() => {
    // Vérifie aussi le retour OAuth Google (?auth=success)
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "success") {
      window.history.replaceState({}, "", window.location.pathname);
    }

    fetch(`${API}/api/v1/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data?.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Inscription email/mot de passe
  const signup = async ({ email, password, password_confirmation, name }) => {
    const res = await fetch(`${API}/api/v1/signup`, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ user: { email, password, password_confirmation, name } }),
    });
    const data = await res.json();
    if (res.ok) { setUser(data.user); return { ok: true }; }
    return { ok: false, errors: data.errors };
  };

  // Connexion email/mot de passe
  const login = async ({ email, password }) => {
    const res = await fetch(`${API}/api/v1/login`, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) { setUser(data.user); return { ok: true }; }
    return { ok: false, error: data.error };
  };

  // Déconnexion
  const logout = async () => {
    await fetch(`${API}/api/v1/logout`, {
      method:      "DELETE",
      credentials: "include",
    });
    setUser(null);
  };

  // Connexion Google OAuth2 — redirige vers le backend
  const loginWithGoogle = () => {
    window.location.href = `${API}/users/auth/google_oauth2`;
  };

  return { user, loading, signup, login, logout, loginWithGoogle };
}