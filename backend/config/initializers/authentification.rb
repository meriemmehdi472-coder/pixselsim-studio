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

Rails.application.config.middleware.use OmniAuth::Builder do
  provider :google_oauth2,
  ENV["GOOGLE_CLIENT_ID"] || Rails.application.credentials.dig(:google, :client_id),
  ENV["GOOGLE_CLIENT_SECRET"] || Rails.application.credentials.dig(:google, :client_secret),  
  {
      scope:         "email,profile",
      prompt:        "select_account",
      callback_path: "/auth/google_oauth2/callback"
    }
end