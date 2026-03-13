class VideoExport < ApplicationRecord
  belongs_to :media_file
  has_one_attached :file

  before_create :generate_token

  def download_url
    return nil unless file.attached? && status == "done"
    Rails.application.routes.url_helpers.rails_blob_url(file, disposition: "attachment", only_path: true)
  end

  private

  def generate_token
    self.token = SecureRandom.urlsafe_base64(24)
  end
end