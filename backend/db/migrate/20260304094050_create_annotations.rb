class CreateAnnotations < ActiveRecord::Migration[7.2]
  def change
    create_table :annotations do |t|
      t.string :content
      t.string :annotation_type
      t.float :pos_x
      t.float :pos_y
      t.references :layer, null: false, foreign_key: true

      t.timestamps
    end
  end
end
