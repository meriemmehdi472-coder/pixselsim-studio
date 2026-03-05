# app/jobs/video_export_job.rb
class VideoExportJob < ApplicationJob
  queue_as :default

  def perform(media_file_id, layer_ids, export_token,
              crop: nil, canvas_w: nil, canvas_h: nil,
              frame_preset: nil, frame_color: nil, frame_thickness: nil,
              layers_meta: [])

    export     = VideoExport.find_by!(token: export_token)
    export.update!(status: "processing")

    media_file = MediaFile.find(media_file_id)
    layers     = Layer.where(id: layer_ids).includes(:annotations).to_a

    # Injecter les métadonnées de style sur les objets Layer en mémoire
    Array(layers_meta).each do |meta|
      id    = (meta[:id] || meta["id"]).to_i
      layer = layers.find { |l| l.id == id }
      next unless layer
      tc = meta[:text_color] || meta["text_color"]
      fs = meta[:font_size]  || meta["font_size"]
      layer.define_singleton_method(:text_color) { tc }
      layer.define_singleton_method(:font_size)  { fs&.to_i || 28 }
    end

    crop_params    = crop&.transform_keys(&:to_sym)
    frame_preset_h = frame_preset&.transform_keys(&:to_s)

    output_path = VideoCompositorService.new(
      media_file,
      layers,
      crop:            crop_params,
      canvas_w:        canvas_w,
      canvas_h:        canvas_h,
      frame_preset:    frame_preset_h,
      frame_color:     frame_color,
      frame_thickness: frame_thickness
    ).call

    export.file.attach(
      io:           File.open(output_path),
      filename:     "export_#{media_file_id}_#{Time.now.to_i}.mp4",
      content_type: "video/mp4"
    )
    export.update!(status: "done")

    # Notifier le front via ActionCable
    ActionCable.server.broadcast("export_channel_#{export.token}", {
      status:    "done",
      video_url: Rails.application.routes.url_helpers.url_for(export.file)
    })

    File.delete(output_path) if File.exist?(output_path)

  rescue => e
    Rails.logger.error("[VideoExportJob] FAILED: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
    VideoExport.find_by(token: export_token)&.update!(status: "failed", error: e.message.truncate(500))
  end
end