# app/controllers/api/v1/exports_controller.rb
module Api
  module V1
    class ExportsController < ApplicationController

      # ── POST /api/v1/projects/:project_id/media_files/:media_file_id/exports
      #
      # Body JSON :
      #   {
      #     layer_ids:      [1, 2],
      #     layers_meta:    [{ id: 1, text_color: "#fff", font_size: 24 }],
      #     crop:           { x:, y:, w:, h:, video_w:, video_h: },   ← vidéo seulement
      #     canvas_w:       800,
      #     canvas_h:       450,
      #     frame_preset:   { clipType: "radius", clipValue: "50%", border: {...} },
      #     frame_color:    "#ffffff",
      #     frame_thickness: 3
      #   }
      def create
        media_file     = MediaFile.find(params[:media_file_id])
        layer_ids      = Array(params[:layer_ids])
        crop           = params[:crop].present?          ? params[:crop].to_unsafe_h : nil
        canvas_w       = params[:canvas_w]&.to_f
        canvas_h       = params[:canvas_h]&.to_f
        layers_meta    = Array(params[:layers_meta])
        frame_preset   = params[:frame_preset].present?  ? params[:frame_preset].to_unsafe_h : nil
        frame_color    = params[:frame_color]
        frame_thickness = params[:frame_thickness]&.to_i

        # Récupérer les layers et leur injecter les métadonnées de style
        layers = Layer.where(id: layer_ids).includes(:annotations).to_a
        enrich_layers_with_meta(layers, layers_meta)

        if media_file.media_type == "image"
          # ── Export photo synchrone via ImageMagick ─────────────────────────
          export_photo(media_file, layers, frame_preset, frame_color, frame_thickness)
        else
          # ── Export vidéo asynchrone via ffmpeg ────────────────────────────
          export_video(media_file, layer_ids, layers_meta, crop, canvas_w, canvas_h,
                       frame_preset, frame_color, frame_thickness)
        end
      end

      # ── GET /api/v1/exports/:token
      def show
        @export = VideoExport.find_by!(token: params[:id])
        render json: {
          id:         @export.id,
          status:     @export.status,
          video_url:  @export.status == "done" && @export.file.attached? ? url_for(@export.file) : nil,
          error:      @export.error
        }
      end

      private

      def enrich_layers_with_meta(layers, layers_meta)
        return if layers_meta.empty?
        layers_meta.each do |meta|
          id    = (meta[:id] || meta["id"]).to_i
          layer = layers.find { |l| l.id == id }
          next unless layer
          tc = meta[:text_color] || meta["text_color"]
          fs = meta[:font_size]  || meta["font_size"]
          layer.define_singleton_method(:text_color) { tc }
          layer.define_singleton_method(:font_size)  { fs&.to_i || 28 }
        end
      end

      # ── Photo : ImageMagick synchrone ─────────────────────────────────────
      def export_photo(media_file, layers, frame_preset, frame_color, frame_thickness)
        output_path = PhotoExportService.new(
          media_file, layers,
          frame_preset:    frame_preset,
          frame_color:     frame_color,
          frame_thickness: frame_thickness
        ).call

        # Attacher le résultat à un VideoExport (réutilise le modèle pour l'URL)
        export = VideoExport.create!(media_file: media_file, status: "done")
        export.file.attach(
          io:           File.open(output_path),
          filename:     "export_#{Time.now.to_i}.png",
          content_type: "image/png"
        )

        render json: {
          status:    "done",
          image_url: url_for(export.file)
        }, status: :created

      rescue => e
        Rails.logger.error("[export_photo] #{e.message}")
        render json: { error: e.message }, status: :unprocessable_entity
      ensure
        File.delete(output_path) if output_path && File.exist?(output_path.to_s)
      end

      # ── Vidéo : ffmpeg asynchrone ─────────────────────────────────────────
      def export_video(media_file, layer_ids, layers_meta, crop, canvas_w, canvas_h,
                       frame_preset, frame_color, frame_thickness)
        export = VideoExport.create!(media_file: media_file, status: "pending")

        VideoExportJob.perform_later(
          media_file.id,
          layer_ids,
          export.token,
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
    end
  end
end