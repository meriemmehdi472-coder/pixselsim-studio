class MediaFile < ApplicationRecord
  belongs_to :project
  has_many :layers, dependent: :destroy
  has_one_attached :file

  ALLOWED_TYPES = %w[image video].freeze

  validates :media_type, inclusion: { in: ALLOWED_TYPES }
end