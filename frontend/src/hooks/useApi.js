const API = (import.meta.env.VITE_API_URL || "http://localhost:3000") + "/api/v1";

export function useApi() {
  const request = async (path, options = {}) => {
    const isFormData = options.body instanceof FormData;

    const token = localStorage.getItem("auth_token");

    const headers = isFormData
      ? {}
      : { "Content-Type": "application/json" };

    if (token) headers["Authorization"] = `Bearer ${token}`;


    const res = await fetch(`${API}${path}`, {
      credentials: "include",
      headers: isFormData ? {} : { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  return { request };
}