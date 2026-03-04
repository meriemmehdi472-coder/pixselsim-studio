class Project < ApplicationRecord
  has_many :media_files, dependent: :destroy
  validates :title, presence: true
end