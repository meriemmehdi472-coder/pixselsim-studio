class Project < ApplicationRecord
  belongs_to :user
  has_many :media_files, dependent: :destroy
  validates :title, presence: true
end