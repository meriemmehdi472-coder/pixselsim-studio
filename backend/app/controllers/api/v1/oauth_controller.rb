module Api
  module V1
    class OauthController < Devise::OmniauthCallbacksController
      FRONTEND_URL = ENV.fetch("FRONTEND_URL", "http://localhost:5173")

      def google_oauth2
        request.env["devise.mapping"] = Devise.mappings[:user]
        auth = request.env["omniauth.auth"]

        if auth.blank?
          return redirect_to "#{FRONTEND_URL}/login?error=oauth_failed", allow_other_host: true
        end

        @user = User.from_omniauth(auth)

        if @user.persisted?
          session[:user_id] = @user.id
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

      def failure
        redirect_to "#{FRONTEND_URL}/login?error=#{params[:message]}", allow_other_host: true
      end
    end
  end
end