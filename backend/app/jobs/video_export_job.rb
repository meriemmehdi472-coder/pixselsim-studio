class VideoExportJob < ApplicationJob
  # Queue dédiée pour isoler les exports vidéo (qui sont lourds en CPU)
  queue_as :video_export

  def perform(media_file_id, layer_ids, export_token,
              crop: nil, canvas_w: nil, canvas_h: nil,
              frame_preset: nil, frame_color: nil, frame_thickness: nil,
              layers_meta: [])

    # 1. Passer le statut à "processing" pour que le front le sache
    export = VideoExport.find_by!(token: export_token)
    export.update!(status: "processing")

    media_file = MediaFile.find(media_file_id)
    layers     = Layer.where(id: layer_ids).includes(:annotations).to_a

    # 2. Injecter les métadonnées de style (couleur texte, taille police)
    #    directement sur les objets Ruby en mémoire, sans toucher la BDD
    Array(layers_meta).each do |meta|
      id    = (meta[:id] || meta["id"]).to_i
      layer = layers.find { |l| l.id == id }
      next unless layer
      tc = meta[:text_color] || meta["text_color"]
      fs = meta[:font_size]  || meta["font_size"]
      layer.define_singleton_method(:text_color) { tc }
      layer.define_singleton_method(:font_size)  { fs&.to_i || 28 }
    end

    # 3. Lancer le service qui construit et exécute la commande ffmpeg
    output_path = VideoCompositorService.new(
      media_file, layers,
      crop:            crop&.transform_keys(&:to_sym),
      canvas_w:        canvas_w,
      canvas_h:        canvas_h,
      frame_preset:    frame_preset&.transform_keys(&:to_s),
      frame_color:     frame_color,
      frame_thickness: frame_thickness
    ).call

    # 4. Attacher le fichier exporté à Active Storage
    export.file.attach(
      io:           File.open(output_path),
      filename:     "export_#{media_file_id}_#{Time.now.to_i}.mp4",
      content_type: "video/mp4"
    )
    export.update!(status: "done")

    # 5. Générer l'URL publique du fichier (nécessite host configuré dans development.rb)
    video_url = Rails.application.routes.url_helpers.rails_blob_url(
      export.file.blob,
      host: "localhost",
      port: 3000
    )

    # 6. Notifier le front via ActionCable — déclenche le téléchargement automatique
    ActionCable.server.broadcast("export_channel_#{export.token}", {
      status:    "done",
      video_url: video_url
    })

    # 7. Nettoyage du fichier temporaire généré par ffmpeg
    File.delete(output_path) if File.exist?(output_path)

  rescue => e
    # En cas d'erreur ffmpeg ou autre, on met à jour le statut pour que le front l'affiche
    Rails.logger.error("[VideoExportJob] FAILED: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
    VideoExport.find_by(token: export_token)&.update!(status: "failed", error: e.message.truncate(500))
  end
end






# Job asynchrone qui traite l'export vidéo via ffmpeg.
# Exécuté par Solid Queue dans une queue dédiée "video_export"
# pour ne pas bloquer les autres jobs (emails, etc.).
#
# Cycle de vie :
#   pending → processing → done (ou failed)
#
# Le front-end poll GET /api/v1/exports/:token toutes les 2s
# et reçoit la notification finale via ActionCable.
#
