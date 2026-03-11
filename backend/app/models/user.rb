class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :omniauthable, omniauth_providers: [:google_oauth2]

  has_many :media_files, dependent: :destroy
  has_many :projects, dependent: :destroy
  def self.from_omniauth(auth)
    where(provider: auth.provider, uid: auth.uid).first_or_create do |user|
      user.email      = auth.info.email
      user.name       = auth.info.name
      user.avatar_url = auth.info.image
      user.password   = Devise.friendly_token[0, 20]
    end
  end
end