class Annotation < ApplicationRecord
  belongs_to :layer

  ANNOTATION_TYPES = %w[text emoji sticker].freeze
  validates :annotation_type, inclusion: { in: ANNOTATION_TYPES }
end