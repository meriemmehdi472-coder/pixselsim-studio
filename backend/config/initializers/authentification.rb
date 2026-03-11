# ── Session cookie ──────────────────────────────────────────────────────────
Rails.application.config.middleware.use ActionDispatch::Cookies

Rails.application.config.middleware.use ActionDispatch::Session::CookieStore,
  key:      "_pixselsim_session",
  secure:   Rails.env.production?,
  httponly: true,
  same_site: Rails.env.production? ? :none : :lax

# ── OmniAuth Google ─────────────────────────────────────────────────────────
OmniAuth.config.allowed_request_methods = [:get, :post]
OmniAuth.config.silence_get_warning     = true
OmniAuth.config.full_host = ENV.fetch("BACKEND_URL", "http://localhost:3000")