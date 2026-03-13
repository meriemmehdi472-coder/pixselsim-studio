class CreateVideoExports < ActiveRecord::Migration[7.2]
  def change
    create_table :video_exports do |t|
      t.string     :token,    null: false, index: { unique: true }
      t.string     :status,   default: "pending"  # pending | processing | done | failed
      t.text       :error
      t.references :media_file, null: false, foreign_key: true
      t.timestamps
    end
  end
end