class Layer < ApplicationRecord
  belongs_to :media_file
  has_many :annotations, dependent: :destroy

  LAYER_TYPES = %w[crop frame text emoji].freeze
  validates :layer_type, inclusion: { in: LAYER_TYPES }
end