module Api
  module V1
    class SessionsController < ApplicationController
      before_action :authenticate!, only: [:destroy, :me]

      # POST /api/v1/login
      def create
        @user = User.find_by(email: params[:email]&.downcase&.strip)

        if @user&.valid_password?(params[:password])
          if Rails.env.production?
            token = @user.generate_auth_token
            render json: {
              message: "Connexion réussie",
              user: serialize_user(@user),
              token: token
            }, status: :ok
          else
            session[:user_id] = @user.id
            render json: {
              message: "Connexion réussie",
              user: serialize_user(@user)
            }, status: :ok
          end
        else
          render json: { error: "Email ou mot de passe incorrect" }, status: :unauthorized
        end
      end

      # DELETE /api/v1/logout
      def destroy
        session.delete(:user_id)
        render json: { message: "Déconnexion réussie" }, status: :ok
      end

      # GET /api/v1/me
      # Permet au front de récupérer l'utilisateur courant après un refresh de page
      def me
        render json: { user: serialize_user(current_user) }, status: :ok
      end

      private

      def serialize_user(user)
        {
          id:         user.id,
          email:      user.email,
          name:       user.name,
          avatar_url: user.avatar_url
        }
      end
    end
  end
end








# Gère la connexion et la déconnexion par email/mot de passe.
#
# POST   /api/v1/login   → connexion
# DELETE /api/v1/logout  → déconnexion
# GET    /api/v1/me      → retourne l'utilisateur connecté (pour hydrater le front au refresh)
#