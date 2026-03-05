require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.enable_reloading = true
  config.eager_load = false
  config.consider_all_requests_local = true
  config.server_timing = true

  if Rails.root.join("tmp/caching-dev.txt").exist?
    config.cache_store = :memory_store
    config.public_file_server.headers = { "Cache-Control" => "public, max-age=#{2.days.to_i}" }
  else
    config.action_controller.perform_caching = false
    config.cache_store = :null_store
  end

  # Utilise le stockage local (attention : s'efface au redémarrage sur Render)
  config.active_storage.service = :local

  config.action_mailer.raise_delivery_errors = false
  config.action_mailer.perform_caching = false

  # --- AJUSTEMENT DYNAMIQUE DES URLS ---
  # Si BACKEND_URL existe (sur Render), on l'utilise. Sinon, localhost.
  host_url = ENV['BACKEND_URL'] || "localhost:3000"
  
  config.action_mailer.default_url_options = { host: host_url }
  Rails.application.routes.default_url_options = { host: host_url }
  # -------------------------------------

  config.active_support.deprecation = :log
  config.active_support.disallowed_deprecation = :raise
  config.active_support.disallowed_deprecation_warnings = []

  config.active_record.migration_error = :page_load
  config.active_record.verbose_query_logs = true
  config.active_job.verbose_enqueue_logs = true

  config.action_view.annotate_rendered_view_with_filenames = true
  config.action_controller.raise_on_missing_callback_actions = true
end