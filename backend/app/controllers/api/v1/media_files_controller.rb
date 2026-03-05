# app/controllers/api/v1/media_files_controller.rb
module Api
  module V1
    class MediaFilesController < ApplicationController
      before_action :set_project
      before_action :set_media_file, only: [:show, :destroy, :crop, :ancestors]

      def index
        @media_files = @project.media_files
        render json: @media_files.map { |mf| serialize_media_file(mf) }
      end

      def show
        render json: serialize_media_file(@media_file)
      end

      def create
        @media_file = @project.media_files.new(media_file_params)

        if params[:file].present?
          @media_file.file.attach(params[:file])
          @media_file.media_type = detect_media_type(params[:file])
          @media_file.file_path  = @media_file.file.filename.to_s
        end

        if @media_file.save
          render json: serialize_media_file(@media_file), status: :created
        else
          render json: @media_file.errors, status: :unprocessable_entity
        end
      end

      def destroy
        @media_file.destroy
        render json: { message: "Fichier supprimé" }
      end

      # ── GET /api/v1/projects/:project_id/media_files/:id/ancestors
      # Retourne la chaîne de versions parentes (du plus récent au plus ancien)
      def ancestors
        chain = @media_file.ancestors.map { |mf| serialize_media_file(mf) }
        render json: chain
      end

      # ── POST /api/v1/projects/:project_id/media_files/:id/crop
      #
      # Body JSON :
      #   { crop: { x:, y:, w:, h:, video_w:, video_h: } }
      #
      # 1. Lance ffmpeg pour recadrer la vidéo
      # 2. Crée un nouveau MediaFile enfant avec le résultat
      # 3. Retourne le nouveau MediaFile (avec son URL)
      def crop
        crop_params = params.require(:crop).permit(:x, :y, :w, :h, :video_w, :video_h).to_h

        output_path = VideoCropService.new(@media_file, crop_params).call

        # Créer un nouveau MediaFile enfant dans le même projet
        child = @project.media_files.new(
          media_type: "video",
          file_path:  "cropped_#{@media_file.file_path}",
          parent_id:  @media_file.id,
          crop_params: crop_params.to_json
        )
        child.file.attach(
          io:           File.open(output_path),
          filename:     "crop_#{Time.now.to_i}.mp4",
          content_type: "video/mp4"
        )
        child.save!

        render json: serialize_media_file(child), status: :created

      rescue => e
        Rails.logger.error("[crop] #{e.message}\n#{e.backtrace.first(5).join("\n")}")
        render json: { error: e.message }, status: :unprocessable_entity
      ensure
        File.delete(output_path) if output_path && File.exist?(output_path.to_s)
      end

      private

      def set_project
        @project = Project.find(params[:project_id])
      end

      def set_media_file
        @media_file = @project.media_files.find(params[:id])
      end

      def media_file_params
        params.permit(:file_path, :media_type)
      end

      def detect_media_type(file)
        file.content_type.start_with?("video/") ? "video" : "image"
      end

      def serialize_media_file(mf)
        {
          id:         mf.id,
          file_path:  mf.file_path,
          media_type: mf.media_type,
          project_id: mf.project_id,
          parent_id:  mf.parent_id,
          url:        mf.file.attached? ? rails_blob_url(mf.file, only_path: false) : nil,
          created_at: mf.created_at
        }
      end
    end
  end
end