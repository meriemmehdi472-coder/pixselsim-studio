class AddParentToMediaFiles < ActiveRecord::Migration[7.2]
  def change
    add_reference :media_files, :parent, foreign_key: { to_table: :media_files }, null: true
    add_column    :media_files, :crop_params, :text  # JSON sérialisé du crop appliqué
  end
end