module Api
  module V1
    class AnnotationsController < ApplicationController
      before_action :authenticate!
      before_action :set_layer
      before_action :set_annotation, only: [:show, :update, :destroy]

      def index
        render json: @layer.annotations
      end

      def show
        render json: @annotation
      end

      def create
        @annotation = @layer.annotations.new(annotation_params)
        if @annotation.save
          render json: @annotation, status: :created
        else
          render json: @annotation.errors, status: :unprocessable_entity
        end
      end

      def update
        if @annotation.update(annotation_params)
          render json: @annotation
        else
          render json: @annotation.errors, status: :unprocessable_entity
        end
      end

      def destroy
        @annotation.destroy
        render json: { message: 'Annotation supprimée' }
      end

      private

      def set_layer
        @layer = Layer.find(params[:layer_id])
      end

      def set_annotation
        @annotation = @layer.annotations.find(params[:id])
      end

      def annotation_params
        params.require(:annotation).permit(:content, :annotation_type, :pos_x, :pos_y)
      end
    end
  end
end