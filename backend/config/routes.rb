# config/routes.rb
Rails.application.routes.draw do
  

  get "auth/google_oauth2/callback", to: "api/v1/oauth#google_callback"
  get "auth/failure" , to: "api/v1/oauth#failure"
  namespace :api do
    namespace :v1 do

      post   "/signup", to: "signup#create"        # Inscription
      post   "/login",  to: "sessions#create"      # Connexion
      delete "/logout", to: "sessions#destroy"     # Déconnexion
      get    "/me",     to: "sessions#me"           # Utilisateur courant (refresh page)


      resources :projects do
        resources :media_files do
          # Crop immédiat → nouveau MediaFile enfant
          post :crop, on: :member
          # Ancêtres (historique versions)
          get  :ancestors, on: :member

          resources :layers do
            resources :annotations
          end
          resources :exports, only: [:create]
        end
      end
      # Poll statut export par token
      resources :exports, only: [:show], param: :token
    end
  end
end