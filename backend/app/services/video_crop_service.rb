# app/services/video_crop_service.rb
#
# Recadre une vidéo avec ffmpeg et retourne le chemin du fichier de sortie.
# Les paramètres x, y, w, h sont exprimés en pixels NATIFS de la vidéo source.
#
class VideoCropService
  def initialize(media_file, crop)
    @media_file = media_file
    @crop       = crop.transform_keys(&:to_sym)
  end

  def call
    input_path  = fetch_input_path
    output_path = Rails.root.join("tmp", "crop_#{SecureRandom.hex(8)}.mp4").to_s

    x = @crop[:x].to_i
    y = @crop[:y].to_i
    w = ((@crop[:w].to_i / 2) * 2)   # doit être pair pour h264
    h = ((@crop[:h].to_i / 2) * 2)

    cmd = [
      "ffmpeg", "-y",
      "-i", input_path,
      "-threads", "0",
      "-vf", "crop=#{w}:#{h}:#{x}:#{y}",
      "-c:v", "libx264", "-preset", "ultrafast", "-tune", "fastdecode", "-crf", "28",
      "-c:a", "copy",
      "-movflags", "+faststart",
      output_path
    ]

    stdout, stderr, status = Open3.capture3(*cmd)

    unless status.success?
      Rails.logger.error("[VideoCropService] ffmpeg stderr:\n#{stderr}")
      raise "ffmpeg crop failed: #{stderr.last(300)}"
    end

    output_path
  ensure
    # Nettoyer le fichier temporaire d'entrée s'il a été téléchargé
    File.delete(input_path) if @tmp_input && File.exist?(input_path.to_s)
  end

  private

  def fetch_input_path
    if @media_file.file.attached?
      # Télécharger le blob dans un fichier tmp pour ffmpeg
      tmp = Tempfile.new(["src", ".mp4"], Rails.root.join("tmp"), binmode: true)
      tmp.write(@media_file.file.download)
      tmp.flush
      @tmp_input = true
      tmp.path
    else
      # Chemin direct (stockage local legacy)
      Rails.root.join("public", @media_file.file_path).to_s
    end
  end
end