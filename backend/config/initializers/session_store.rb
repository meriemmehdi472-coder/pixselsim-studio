# Sur render le frontend et le backend sont sur des domaines
# différents. Pour que les cookies de session fonctionnent en cross-origin,
# il faut same_site: :none et secure: true (HTTPS obligatoire).
#
Rails.application.config.session_store :cookie_store,
  key: "_pixselsim_session",
  same_site: Rails.env.production? ? :none : :lax,
  secure:    Rails.env.production?