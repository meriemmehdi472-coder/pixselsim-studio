# app/controllers/api/v1/exports_controller.rb
module Api
  module V1
    class ExportsController < ApplicationController

      # POST /api/v1/projects/:project_id/media_files/:media_file_id/exports
      def create
        media_file      = MediaFile.find(params[:media_file_id])
        layer_ids       = Array(params[:layer_ids])
        layers_meta     = Array(params[:layers_meta])
        frame_preset    = params[:frame_preset].present? ? params[:frame_preset].to_unsafe_h : nil
        frame_color     = params[:frame_color]
        frame_thickness = params[:frame_thickness]&.to_i
        canvas_w        = params[:canvas_w]&.to_f
        canvas_h        = params[:canvas_h]&.to_f
        crop            = params[:crop].present? ? params[:crop].to_unsafe_h : nil

        media_type = media_file.media_type.to_s.downcase

        if media_type.include?("image") || media_type.include?("photo")
          # ── Export photo SYNCHRONE ──────────────────────────────────────
          layers = Layer.where(id: layer_ids).includes(:annotations).to_a

          Array(layers_meta).each do |meta|
            id    = (meta[:id] || meta["id"]).to_i
            layer = layers.find { |l| l.id == id }
            next unless layer
            tc = meta[:text_color] || meta["text_color"]
            fs = meta[:font_size]  || meta["font_size"]
            layer.define_singleton_method(:text_color) { tc }
            layer.define_singleton_method(:font_size)  { fs&.to_i || 28 }
          end

          output_path = PhotoExportService.new(
            media_file, layers,
            frame_preset:    frame_preset&.transform_keys(&:to_s),
            frame_color:     frame_color,
            frame_thickness: frame_thickness
          ).call

          ext          = File.extname(output_path).delete(".").downcase
          content_type = ext == "png" ? "image/png" : "image/jpeg"

          export = VideoExport.create!(media_file: media_file, status: "done")
          export.file.attach(
            io:           File.open(output_path),
            filename:     "export_#{media_file.id}_#{Time.now.to_i}.#{ext}",
            content_type: content_type
          )

          File.delete(output_path) if File.exist?(output_path)

          render json: {
            token:     export.token,
            status:    "done",
            image_url: url_for(export.file)
          }, status: :created

        else
          # ── Export vidéo ASYNCHRONE ─────────────────────────────────────
          export = VideoExport.create!(media_file: media_file, status: "pending")

          VideoExportJob.perform_later(
            media_file.id, layer_ids, export.token,
            crop:            crop,
            canvas_w:        canvas_w,
            canvas_h:        canvas_h,
            frame_preset:    frame_preset,
            frame_color:     frame_color,
            frame_thickness: frame_thickness,
            layers_meta:     layers_meta
          )

          render json: { token: export.token, status: "pending" }, status: :created
        end

      rescue => e
        Rails.logger.error("[ExportsController] #{e.message}\n#{e.backtrace.first(5).join("\n")}")
        render json: { error: e.message }, status: :unprocessable_entity
      end

      # GET /api/v1/exports/:token
      def show
  @export = VideoExport.find_by!(token: params[:token])
  render json: {
    id:        @export.id,
    status:    @export.status,
    video_url: @export.status == "done" && @export.file.attached? ? url_for(@export.file) : nil,
    error:     @export.error
  }
end
    end
  end
end