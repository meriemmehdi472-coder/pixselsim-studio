# config/initializers/authentification.rb
#
# Configuration de la session cookie et d'OmniAuth pour Google OAuth2.
#
# Prérequis Gemfile :
#   gem "devise"
#   gem "omniauth-google-oauth2"
#   gem "omniauth-rails_csrf_protection"
#
# Variables d'environnement nécessaires (credentials ou ENV) :
#   GOOGLE_CLIENT_ID
#   GOOGLE_CLIENT_SECRET
#   FRONTEND_URL   (ex: https://pixselsim-studio-front.onrender.com)
#
# ── Session cookie ─────────────────────────────────────────────────────────
# Rails API mode ne charge pas les sessions par défaut — on les réactive.
Rails.application.config.session_store :cookie_store,
  key:      "_pixselsim_session",
  secure:   Rails.env.production?,   # HTTPS uniquement en prod
  httponly: true,                    # Inaccessible depuis JS (protection XSS)
  same_site: :lax                    # Autorise les redirections OAuth cross-site

Rails.application.config.middleware.use ActionDispatch::Cookies
Rails.application.config.middleware.use ActionDispatch::Session::CookieStore,
  Rails.application.config.session_options

# ── OmniAuth Google ─────────────────────────────────────────────────────────
OmniAuth.config.allowed_request_methods = [:get, :post]
OmniAuth.config.silence_get_warning     = true

Rails.application.config.middleware.use OmniAuth::Builder do
  provider :google_oauth2,
    ENV.fetch("GOOGLE_CLIENT_ID",     Rails.application.credentials.dig(:google, :client_id)),
    ENV.fetch("GOOGLE_CLIENT_SECRET", Rails.application.credentials.dig(:google, :client_secret)),
    {
      scope:          "email,profile",
      prompt:         "select_account",
      callback_path:  "/auth/google_oauth2/callback"
    }
end