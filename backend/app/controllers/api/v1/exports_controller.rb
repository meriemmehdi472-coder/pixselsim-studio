# app/controllers/api/v1/exports_controller.rb
module Api
  module V1
    class ExportsController < ApplicationController
      # POST /api/v1/projects/:project_id/media_files/:media_file_id/exports
      # Body: {
      #   layer_ids: [1, 2],
      #   crop:      { x:, y:, w:, h:, video_w:, video_h: },
      #   canvas_w:  800,     ← largeur affichée de la vidéo dans le frontend (px écran)
      #   canvas_h:  450,     ← hauteur affichée
      #   layers_meta: [      ← couleur/taille des calques (non stockées en DB)
      #     { id: 1, text_color: "#fff", font_size: 24 }
      #   ]
      # }
      def create
        media_file   = MediaFile.find(params[:media_file_id])
        layer_ids    = Array(params[:layer_ids])
        crop         = params[:crop].present? ? params[:crop].to_unsafe_h : nil
        canvas_w     = params[:canvas_w]&.to_f
        canvas_h     = params[:canvas_h]&.to_f
        layers_meta  = Array(params[:layers_meta])

        # Appliquer les métadonnées de style (couleur, taille) aux layers avant de les passer au job
        # On les stocke temporairement comme attributs virtuels sur les objets Layer en mémoire
        if layers_meta.any?
          layers_meta.each do |meta|
            layer = Layer.find_by(id: meta[:id] || meta["id"])
            next unless layer
            layer.define_singleton_method(:text_color) { meta[:text_color] || meta["text_color"] }
            layer.define_singleton_method(:font_size)  { (meta[:font_size]  || meta["font_size"])&.to_i || 28 }
          end
        end

        export = VideoExport.create!(media_file: media_file, status: "pending")

        VideoExportJob.perform_later(
          media_file.id,
          layer_ids,
          export.token,
          crop:     crop,
          canvas_w: canvas_w,
          canvas_h: canvas_h
        )

        render json: { token: export.token, status: "pending" }, status: :created
      end

      # GET /api/v1/exports/:token
      def show
        export = VideoExport.find_by!(token: params[:token])
        render json: {
          token:        export.token,
          status:       export.status,
          download_url: export.download_url,
          error:        export.error
        }
      end
    end
  end
end