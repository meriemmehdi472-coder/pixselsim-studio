# app/controllers/api/v1/exports_controller.rb
module Api
  module V1
    class ExportsController < ApplicationController
      def create
        media_file  = MediaFile.find(params[:media_file_id])
        layer_ids   = Array(params[:layer_ids])
        canvas_w    = params[:canvas_w]&.to_f
        canvas_h    = params[:canvas_h]&.to_f
        layers_meta = Array(params[:layers_meta])

        # ── frame_preset : to_unsafe_h pour éviter UnfilteredParameters ──
        frame_preset    = params[:frame_preset].present? ? params[:frame_preset].to_unsafe_h : nil
        frame_color     = params[:frame_color]
        frame_thickness = params[:frame_thickness]&.to_i

        # Appliquer les métadonnées de style aux layers
        if layers_meta.any?
          layers_meta.each do |meta|
            layer = Layer.find_by(id: meta[:id] || meta["id"])
            next unless layer
            layer.define_singleton_method(:text_color) { meta[:text_color] || meta["text_color"] }
            layer.define_singleton_method(:font_size)  { (meta[:font_size] || meta["font_size"])&.to_i || 28 }
          end
        end

        export = VideoExport.create!(media_file: media_file, status: "pending")

        VideoExportJob.perform_later(
          media_file.id,
          layer_ids,
          export.token,
          canvas_w:        canvas_w,
          canvas_h:        canvas_h,
          frame_preset:    frame_preset,
          frame_color:     frame_color,
          frame_thickness: frame_thickness
        )

        render json: { token: export.token, status: "pending" }, status: :created
      end

      # GET /api/v1/exports/:token
      def show
        @export = VideoExport.find_by!(token: params[:id])
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