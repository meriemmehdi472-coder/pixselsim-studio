# app/controllers/concerns/authentification.rb
#
# Concern inclus dans ApplicationController.
# Fournit :
#   - current_user  → l'utilisateur connecté (depuis la session cookie)
#   - authenticate! → before_action pour protéger les routes privées
#   - logged_in?    → helper booléen
#
# Stratégie : session cookie standard Rails (sécurisé, httpOnly).
# Devise écrit user_id dans session[:user_id] via sign_in/sign_out.
#
module Authentification
  extend ActiveSupport::Concern

  included do
    helper_method :current_user, :logged_in? if respond_to?(:helper_method)
  end

  # Retourne l'utilisateur connecté ou nil
  def current_user
    @current_user ||= User.find_by(id: session[:user_id]) if session[:user_id]
  end

  # Vérifie si un utilisateur est connecté
  def logged_in?
    current_user.present?
  end

  # À utiliser en before_action sur les routes protégées
  # Ex: before_action :authenticate!
  def authenticate!
    unless logged_in?
      render json: { error: "Non authentifié. Veuillez vous connecter." }, status: :unauthorized
    end
  end
end