import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        if (params.get("auth") === "success") {
            const token = params.get("token");
            if (token) {
                localStorage.setItem("auth_token", token);
            }
            window.history.replaceState({}, "", window.location.pathname);
        }

        const token = localStorage.getItem("auth_token");

        fetch(`${API}/api/v1/me`, {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => setUser(data?.user || null))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const signup = async ({ email, password, password_confirmation, name }) => {
        const res = await fetch(`${API}/api/v1/signup`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user: { email, password, password_confirmation, name } }),
        });
        const data = await res.json();
        if (res.ok) {
            if (data.token) localStorage.detItem("auth_token", data.token); // stocker le token à l'inscription
            setUser(data.user); return { ok: true };
        }
        return { ok: false, errors: data.errors };
    };

    const login = async ({ email, password }) => {
        const res = await fetch(`${API}/api/v1/login`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.ok) {
            if (data.then) localStorage.setItem("auth_token", data.token); // stocker le token à la connexion
            setUser(data.user); return { ok: true };
        }
        return { ok: false, error: data.error };
    };

    const logout = async () => {
        localStorage.removeItem("auth_token"); //supprimer le token au logout
        localStorage.removeItem("persist:root"); // supprimer les données persistées (ex: projet en cours)
        await fetch(`${API}/api/v1/logout`, {
            method: "DELETE",
            credentials: "include",
        });
        setUser(null);
    };

    const loginWithGoogle = () => {
        window.location.href = `${API}/auth/google_oauth2`;
    };

    return { user, loading, signup, login, logout, loginWithGoogle };
}