module Authentification
  extend ActiveSupport::Concern

  included do
    helper_method :current_user, :logged_in? if respond_to?(:helper_method)
  end

  def current_user
    @current_user ||= user_from_token || user_from_session
  end

  def logged_in?
    current_user.present?
  end

  def authenticate!
    unless logged_in?
      render json: { error: "Non authentifié. Veuillez vous connecter." }, status: :unauthorized
    end
  end

  private

  def user_from_token
    token = request.headers["Authorization"]&.split(" ")&.last
    return nil if token.blank?
    decoded = JWT.decode(token, Rails.application.secret_key_base, true, algorithm: "HS256")
    User.find_by(id: decoded[0]["user_id"])
  rescue JWT::DecodeError
    nil
  end

  def user_from_session
    User.find_by(id: session[:user_id]) if session[:user_id]
  end
end