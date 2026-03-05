# app/services/video_compositor_service.rb
#
# Grave textes + emojis dans la vidéo avec ffmpeg.
# Compatible mobile : H.264 Baseline + AAC + faststart + yuv420p
#
# Dépendances :
#   sudo apt install ffmpeg
#   La police DejaVu doit être disponible (apt install fonts-dejavu-core)
#   Pour les emojis : apt install fonts-noto-color-emoji (optionnel, fallback texte sinon)

class VideoCompositorService
  # Positions des calques : transmises en coordonnées d'AFFICHAGE (pixels écran)
  # + canvas_w / canvas_h = dimensions d'affichage de la vidéo dans le frontend
  # On les convertit en coords natives avant de les passer à ffmpeg.

  def initialize(media_file, layers, crop: nil, canvas_w: nil, canvas_h: nil)
    @media_file = media_file
    @layers     = layers
    @crop       = crop          # { x:, y:, w:, h:, video_w:, video_h: } pixels natifs
    @canvas_w   = canvas_w      # largeur vidéo affichée dans le frontend (pixels écran)
    @canvas_h   = canvas_h      # hauteur vidéo affichée dans le frontend
  end

  def call
    input_path  = resolve_input_path
    output_path = Rails.root.join("tmp", "export_#{@media_file.id}_#{Time.now.to_i}.mp4").to_s
    FileUtils.mkdir_p(File.dirname(output_path))

    # Dimensions natives de la vidéo source (via ffprobe)
    native_w, native_h = probe_dimensions(input_path)

    # Dimensions de référence pour la conversion de coords
    # Si on a les infos du canvas frontend, on les utilise ; sinon on utilise le natif
    ref_w = @canvas_w&.to_f || native_w.to_f
    ref_h = @canvas_h&.to_f || native_h.to_f

    vf_parts = []

    # ── 1. Recadrage ────────────────────────────────────────────────────────
    if @crop.present?
      cx = @crop[:x].to_i
      cy = @crop[:y].to_i
      cw = (@crop[:w].to_i / 2 * 2).clamp(2, native_w)
      ch = (@crop[:h].to_i / 2 * 2).clamp(2, native_h)
      vf_parts << "crop=#{cw}:#{ch}:#{cx}:#{cy}"

      # Après le crop, les dimensions de référence pour les calques changent
      ref_w = @canvas_w ? (@canvas_w.to_f * cw / native_w) : cw.to_f
      ref_h = @canvas_h ? (@canvas_h.to_f * ch / native_h) : ch.to_f
      native_w = cw
      native_h = ch
    end

    # Ratio pixels affichés → pixels natifs
    scale_x = native_w.to_f / ref_w
    scale_y = native_h.to_f / ref_h

    # ── 2. Calques texte & emoji ─────────────────────────────────────────────
    text_layers = @layers.select { |l| %w[text emoji].include?(l.layer_type) }

    text_layers.each do |layer|
      anno = layer.annotations.first
      next unless anno&.content.present?

      content = anno.content

      # Convertir position affichée → native
      # Les positions sont stockées comme centre du calque (transform: translate(-50%,-50%))
      raw_x = layer.position_x.to_f
      raw_y = layer.position_y.to_f

      # Décaler si crop actif (la position est relative à la vidéo entière)
      if @crop.present?
        raw_x -= @crop[:x].to_f * (@canvas_w.to_f / @crop[:video_w].to_f)  rescue raw_x
        raw_y -= @crop[:y].to_f * (@canvas_h.to_f / @crop[:video_h].to_f)  rescue raw_y
      end

      native_x = (raw_x * scale_x).round
      native_y = (raw_y * scale_y).round

      if layer.layer_type == "text"
        vf_parts << build_drawtext(content, native_x, native_y, layer)
      elsif layer.layer_type == "emoji"
        # ffmpeg ne gère pas les emojis couleur nativement — on grave le texte Unicode
        # avec une police fallback. Sur serveur avec fonts-noto-color-emoji ça marche bien.
        vf_parts << build_drawtext(content, native_x, native_y, layer, is_emoji: true)
      end
    end

    # ── 3. Compatibilité mobile ──────────────────────────────────────────────
    # yuv420p  : obligatoire pour iOS/Android/QuickTime
    # -profile:v baseline -level 3.1 : compatibilité maximale (vieux iPhones inclus)
    # -movflags +faststart : lecture en streaming possible (pas besoin d'attendre le DL complet)
    # -pix_fmt yuv420p : évite les erreurs de chroma sur certains décodeurs

    vf_chain = vf_parts.join(",")
    vf_arg   = vf_chain.present? ? "-vf \"#{vf_chain}\"" : ""

    cmd = [
      "ffmpeg",
      "-i '#{input_path}'",
      vf_arg,
      "-c:v libx264",
      "-profile:v baseline",   # compatibilité max iOS/Android
      "-level 3.1",
      "-preset ultrafast",
      "-crf 28",
      "-pix_fmt yuv420p",       # obligatoire pour iOS
      "-c:a aac",
      "-b:a 128k",
      "-movflags +faststart",   # lecture streaming mobile
      "-y",
      "'#{output_path}'",
      "2>&1"
    ].reject(&:blank?).join(" ")

    Rails.logger.info("[VideoCompositor] CMD: #{cmd}")
    output = `#{cmd}`

    unless $?.success?
      Rails.logger.error("[VideoCompositor] ffmpeg output:\n#{output}")
      raise "ffmpeg failed:\n#{output.last(500)}"
    end

    output_path
  end

  private

  # ── Probe dimensions natives via ffprobe ───────────────────────────────────
  def probe_dimensions(path)
    out = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 '#{path}' 2>&1`
    parts = out.strip.split(",")
    w = parts[0].to_i
    h = parts[1].to_i
    w = 1920 if w == 0   # fallback
    h = 1080 if h == 0
    [w, h]
  rescue
    [1920, 1080]
  end

  # ── Construire le filtre drawtext ffmpeg ───────────────────────────────────
  def build_drawtext(content, x, y, layer, is_emoji: false)
    text       = escape_ffmpeg(content)
    font_size  = is_emoji ? 40 : (layer.respond_to?(:font_size) ? (layer.font_size || 28) : 28)
    font_color = is_emoji ? "white" : ffmpeg_color(layer.respond_to?(:text_color) ? layer.text_color : nil)

    # Centrer sur la position (car le frontend utilise transform: translate(-50%,-50%))
    x_expr = "#{x}-tw/2"
    y_expr = "#{y}-th/2"

    parts = [
      "text='#{text}'",
      "x=#{x_expr}",
      "y=#{y_expr}",
      "fontsize=#{font_size}",
      "fontcolor=#{font_color}",
    ]

    unless is_emoji
      # Fond semi-transparent + ombre pour lisibilité
      parts += [
        "box=1",
        "boxcolor=black@0.55",
        "boxborderw=6",
        "shadowcolor=black@0.8",
        "shadowx=2",
        "shadowy=2",
      ]
    end

    # Police : DejaVu large dispo sur Ubuntu/Debian
    font_path = find_font(is_emoji)
    parts << "fontfile='#{font_path}'" if font_path

    "drawtext=#{parts.join(':')}"
  end

  # ── Trouver une police disponible sur le serveur ───────────────────────────
  def find_font(emoji = false)
    if emoji
      candidates = [
        "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",
        "/usr/share/fonts/noto/NotoColorEmoji.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      ]
    else
      candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
      ]
    end
    candidates.find { |f| File.exist?(f) }
  end

  # ── Convertir couleur CSS → ffmpeg ────────────────────────────────────────
  def ffmpeg_color(css_color)
    return "white" if css_color.blank?
    # CSS hex → ffmpeg hex (0xRRGGBB)
    hex = css_color.delete("#")
    hex.length == 3 ? "0x#{hex.chars.map{|c| c*2}.join}" : "0x#{hex}"
  rescue
    "white"
  end

  # ── Échapper les caractères spéciaux ffmpeg drawtext ──────────────────────
  def escape_ffmpeg(str)
    str.to_s
       .gsub("\\", "\\\\\\\\")  # \ → \\
       .gsub("'",  "\u2019")    # ' → ' (typographique, évite les quotes)
       .gsub(":",  "\\:")       # : → \:
       .gsub("%",  "\\%")       # % → \%
       .gsub("\n", " ")         # newlines → espace
  end

  # ── Résoudre le chemin du fichier vidéo source ────────────────────────────
  def resolve_input_path
    if @media_file.file.attached?
      ActiveStorage::Blob.service.path_for(@media_file.file.key)
    else
      @media_file.file_path
    end
  end
end