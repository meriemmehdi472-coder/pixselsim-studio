class ApplicationController < ActionController::API
  include Authentification
  rescue_from ActiveRecord::RecordNotFound, with: :not_found

  private

  def not_found
    render json: { error: 'Ressource introuvable' }, status: :not_found
  end
end


# # app/controllers/application_controller.rb

# class ApplicationController < ActionController::Base
#   protect_from_forgery with: :exception

#   before_action :authenticate_user!

#   # Renvoie l'utilisateur connecté en JSON pour React
#   def current_user_json
#     if current_user
#       render json: {
#         id:         current_user.id,
#         email:      current_user.email,
#         name:       current_user.name,
#         avatar_url: current_user.avatar_url
#       }
#     else
#       render json: { error: 'Non authentifié' }, status: :unauthorized
#     end
#   end
# end