class CreateLayers < ActiveRecord::Migration[7.2]
  def change
    create_table :layers do |t|
      t.string :layer_type
      t.float :position_x
      t.float :position_y
      t.references :media_file, null: false, foreign_key: true

      t.timestamps
    end
  end
end
