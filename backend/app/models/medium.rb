class Medium < ApplicationRecord
  belongs_to :project
  belongs_to :media
  belongs_to :layer
end
