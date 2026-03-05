# app/controllers/api/v1/exports_controller.rb
#
# Contrôleur qui gère les exports de médias (photos et vidéos).
#
# Routes :
#   POST /api/v1/projects/:project_id/media_files/:media_file_id/exports
#     → Lance un export et retourne un token de suivi
#   GET  /api/v1/exports/:token
#     → Retourne le statut de l'export (pending / processing / done / failed)
#
module Api
  module V1
    class ExportsController < ApplicationController

      # POST /api/v1/projects/:project_id/media_files/:media_file_id/exports
      #
      # Pour les PHOTOS → export synchrone (réponse immédiate avec l'URL)
      # Pour les VIDÉOS  → export asynchrone via Solid Queue (polling nécessaire)
      def create
        media_file      = MediaFile.find(params[:media_file_id])
        layer_ids       = Array(params[:layer_ids])
        layers_meta     = Array(params[:layers_meta])  # Métadonnées de style (couleur, taille police)
        frame_preset    = params[:frame_preset].present? ? params[:frame_preset].to_unsafe_h : nil
        frame_color     = params[:frame_color]
        frame_thickness = params[:frame_thickness]&.to_i
        canvas_w        = params[:canvas_w]&.to_f
        canvas_h        = params[:canvas_h]&.to_f
        crop            = params[:crop].present? ? params[:crop].to_unsafe_h : nil

        media_type = media_file.media_type.to_s.downcase

        if media_type.include?("image") || media_type.include?("photo")
          # ── Export PHOTO ────────────────────────────────────────────────
          # Si aucun layer persisté en BDD → on retourne directement l'URL
          # du média original (l'export canvas est fait côté client)
          layers = Layer.where(id: layer_ids).includes(:annotations).to_a

          if layers.empty? && !media_file.file.attached?
            render json: { error: "Fichier média introuvable" }, status: :unprocessable_entity
            return
          end

          # Pas de layers BDD : retourner l'URL directe du fichier original
          if layers.empty?
            render json: {
              token:     SecureRandom.hex(8),
              status:    "done",
              image_url: rails_blob_url(media_file.file, disposition: "attachment")
            }, status: :created
            return
          end

          # Avec layers : utiliser PhotoExportService si disponible
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
            image_url: rails_blob_url(export.file, disposition: "attachment")
          }, status: :created

        else
          # ── Export VIDÉO : traitement asynchrone ────────────────────────
          # La vidéo peut prendre plusieurs secondes/minutes selon sa durée.
          # On crée l'export, lance le job, et le front poll /exports/:token
          # toutes les 2 secondes pour connaître l'avancement.
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
        # En cas d'erreur, on logue et on renvoie un JSON lisible au lieu d'un 500 muet
        Rails.logger.error("[ExportsController] #{e.message}\n#{e.backtrace.first(5).join("\n")}")
        render json: { error: e.message }, status: :unprocessable_entity
      end

      # GET /api/v1/exports/:token
      #
      # Endpoint de polling — le front appelle cette route toutes les 2 secondes
      # jusqu'à ce que status soit "done" ou "failed"
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