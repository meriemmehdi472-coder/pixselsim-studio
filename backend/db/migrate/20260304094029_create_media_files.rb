class CreateMediaFiles < ActiveRecord::Migration[7.2]
  def change
    create_table :media_files do |t|
      t.string :file_path
      t.string :media_type
      t.references :project, null: false, foreign_key: true

      t.timestamps
    end
  end
end
