# app/jobs/video_export_job.rb
class VideoExportJob < ApplicationJob
  queue_as :default

  def perform(media_file_id, layer_ids, export_token, crop: nil, canvas_w: nil, canvas_h: nil)
    export     = VideoExport.find_by!(token: export_token)
    export.update!(status: "processing")

    media_file = MediaFile.find(media_file_id)
    layers     = Layer.where(id: layer_ids).includes(:annotations)

    crop_params = crop&.transform_keys(&:to_sym)

    output_path = VideoCompositorService.new(
      media_file,
      layers,
      crop:     crop_params,
      canvas_w: canvas_w,
      canvas_h: canvas_h
    ).call

    export.file.attach(
      io:           File.open(output_path),
      filename:     "export_#{media_file_id}_#{Time.now.to_i}.mp4",
      content_type: "video/mp4"
    )
    export.update!(status: "done")
    File.delete(output_path) if File.exist?(output_path)

  rescue => e
    Rails.logger.error("[VideoExportJob] FAILED: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
    VideoExport.find_by(token: export_token)&.update!(status: "failed", error: e.message.truncate(500))
  end
end