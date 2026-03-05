# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
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