class ApplicationController < ActionController::API
  include Authentification
  rescue_from ActiveRecord::RecordNotFound, with: :not_found

  private

  def not_found
    render json: { error: 'Ressource introuvable' }, status: :not_found
  end
end


