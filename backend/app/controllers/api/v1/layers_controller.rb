module Api
  module V1
    class LayersController < ApplicationController
      before_action :set_media_file
      before_action :set_layer, only: [:show, :update, :destroy]

      def index
        render json: @media_file.layers
      end

      def show
        render json: @layer
      end

      def create
        @layer = @media_file.layers.new(layer_params)
        if @layer.save
          render json: @layer, status: :created
        else
          render json: @layer.errors, status: :unprocessable_entity
        end
      end

      def update
        if @layer.update(layer_params)
          render json: @layer
        else
          render json: @layer.errors, status: :unprocessable_entity
        end
      end

      def destroy
        @layer.destroy
        render json: { message: 'Calque supprimé' }
      end

      private

      def set_media_file
        @media_file = MediaFile.find(params[:media_file_id])
      end

      def set_layer
        @layer = @media_file.layers.find(params[:id])
      end

      def layer_params
        params.require(:layer).permit(:layer_type, :position_x, :position_y)
      end
    end
  end
end