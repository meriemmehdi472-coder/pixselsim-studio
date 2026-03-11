useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  
  if (params.get("auth") === "success") {
    const token = params.get("token"); //  récupérer le token
    if (token) {
      localStorage.setItem("auth_token", token); // sauvegarder
    }
    window.history.replaceState({}, "", window.location.pathname);
  }

  const token = localStorage.getItem("auth_token");

  fetch(`${API}/api/v1/me`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {}, // envoyer le token
  })
    .then(r => r.ok ? r.json() : null)
    .then(data => setUser(data?.user || null))
    .catch(() => setUser(null))
    .finally(() => setLoading(false));
}, []);