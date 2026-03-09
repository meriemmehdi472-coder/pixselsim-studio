# app/controllers/api/v1/signup_controller.rb
#
# Gère l'inscription d'un nouvel utilisateur par email/mot de passe.
#
# POST /api/v1/signup
# Body JSON : { user: { email:, password:, password_confirmation:, name: } }
#
module Api
  module V1
    class SignupController < ApplicationController

      
      # POST /api/v1/signup
      def create
        @user = User.new(signup_params)

        if @user.save
          # Connecte automatiquement l'utilisateur après inscription
          session[:user_id] = @user.id

          render json: {
            message: "Compte créé avec succès",
            user: serialize_user(@user)
          }, status: :created
        else
          render json: {
            errors: @user.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      private

      def signup_params
        params.require(:user).permit(:email, :password, :password_confirmation, :name)
      end

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