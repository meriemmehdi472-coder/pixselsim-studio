class MediaFile < ApplicationRecord
  belongs_to :project
  belongs_to :parent, class_name: "MediaFile", optional: true
  has_many   :children, class_name: "MediaFile", foreign_key: :parent_id, dependent: :destroy
  has_many   :layers, dependent: :destroy
  has_one_attached :file
  has_many   :video_exports, dependent: :destroy

  # Retourne tous les ancêtres (parent, grand-parent…) du plus récent au plus ancien
  def ancestors
    chain = []
    node  = self
    while node.parent
      chain << node.parent
      node = node.parent
    end
    chain
  end
end