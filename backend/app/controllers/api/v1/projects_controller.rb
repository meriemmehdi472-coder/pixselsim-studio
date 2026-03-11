module Api
  module V1
    class ProjectsController < ApplicationController
      before_action :authenticate!
      def index
        # @projects = Project.all
        @projects = current_user.projects
        render json: @projects

      end

      def show
        # @project = Project.find(params[:id])
        @project = current_user.projects.find(params[:id])
        render json: @project
      end

      def create
        @project = current_user.projects.new(project_params)
        if @project.save
          render json: @project, status: :created
        else
          render json: @project.errors, status: :unprocessable_entity
        end
      end

      def destroy
        @project =current_user.projects.find(params[:id])
        @project.destroy
        render json: { message: 'Projet supprimé' }
      end

      private

      def project_params
        params.require(:project).permit(:title, :description)
      end
    end
  end
end