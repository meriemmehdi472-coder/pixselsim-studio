module Api
  module V1
    class MediaFilesController < ApplicationController
      before_action :set_project
      before_action :set_media_file, only: [:show, :destroy]

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
          @media_file.file_path = @media_file.file.filename.to_s
        end

        if @media_file.save
          render json: serialize_media_file(@media_file), status: :created
        else
          render json: @media_file.errors, status: :unprocessable_entity
        end
      end

      def destroy
        @media_file.destroy
        render json: { message: 'Fichier supprimé' }
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
        content_type = file.content_type
        content_type.start_with?('video/') ? 'video' : 'image'
      end

      def serialize_media_file(mf)
        {
          id: mf.id,
          file_path: mf.file_path,
          media_type: mf.media_type,
          project_id: mf.project_id,
          url: mf.file.attached? ? Rails.application.routes.url_helpers.rails_blob_url(mf.file, only_path: false) : nil,
          created_at: mf.created_at
        }
      end
    end
  end
end