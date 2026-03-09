# app/controllers/api/v1/oauth_controller.rb
#
# Gère le callback Google OAuth2 via OmniAuth.
# OmniAuth intercepte /auth/google_oauth2/callback et peuple request.env["omniauth.auth"].
#
# Flow complet :
#   1. Front redirige vers GET /auth/google_oauth2
#   2. Google redirige vers GET /auth/google_oauth2/callback (géré ici)
#   3. On crée/trouve l'utilisateur via User.from_omniauth
#   4. On ouvre une session cookie et on redirige le front
#
# La redirection finale va vers le frontend Vite/React avec un paramètre ?auth=success
# pour que le front sache qu'il doit rafraîchir l'état d'auth via GET /api/v1/me.
#
module Api
  module V1
    class OauthController < ApplicationController
        before_action :authenticate!
        FRONTEND_URL = ENV.fetch("FRONTEND_URL", "http://localhost:5173")

      # GET /auth/google_oauth2/callback
      def google_callback
        auth = request.env["omniauth.auth"]

        if auth.blank?
          return redirect_to "#{FRONTEND_URL}/login?error=oauth_failed", allow_other_host: true
        end

        @user = User.from_omniauth(auth)

        if @user.persisted?
          session[:user_id] = @user.id

          # Redirige vers le front — le front appelle ensuite GET /api/v1/me pour hydrater le store
          redirect_to "#{FRONTEND_URL}?auth=success", allow_other_host: true
        else
          errors = @user.errors.full_messages.join(", ")
          Rails.logger.error("[OauthController] Échec création user: #{errors}")
          redirect_to "#{FRONTEND_URL}/login?error=account_creation_failed", allow_other_host: true
        end

      rescue => e
        Rails.logger.error("[OauthController] #{e.message}\n#{e.backtrace.first(3).join("\n")}")
        redirect_to "#{FRONTEND_URL}/login?error=server_error", allow_other_host: true
      end

      # GET /auth/failure
      # OmniAuth redirige ici si l'utilisateur refuse l'accès Google
      def failure
        redirect_to "#{FRONTEND_URL}/login?error=#{params[:message]}", allow_other_host: true
      end
    end
  end
end