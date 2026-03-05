# app/services/photo_export_service.rb
#
# Ce service exporte une photo avec les modifications appliquées :
#   - Calques texte incrustés via ImageMagick (MiniMagick)
#   - Calques emoji
#   - Cadres et formes (cercle, arrondi, polygone, bordure colorée)
#
# Contrairement à VideoCompositorService (ffmpeg), ce service utilise
# MiniMagick (wrapper Ruby pour ImageMagick) car les photos n'ont pas besoin
# d'encodage vidéo.
#
require "mini_magick"

class PhotoExportService
  # @param media_file     [MediaFile]  La photo source
  # @param layers         [Array]      Les calques à appliquer
  # @param frame_preset   [Hash]       Preset de cadre (clipType, clipValue, border)
  # @param frame_color    [String]     Couleur personnalisée de la bordure (#hex)
  # @param frame_thickness [Integer]  Épaisseur de la bordure en pixels
  def initialize(media_file, layers, frame_preset: nil, frame_color: nil, frame_thickness: nil)
    @media_file      = media_file
    @layers          = layers
    @frame_preset    = frame_preset
    @frame_color     = frame_color
    @frame_thickness = frame_thickness&.to_i
  end

  # Exécute l'export : applique les calques et le cadre, puis sauvegarde en PNG
  # @return [String] Chemin vers le fichier image exporté (tmp/)
  def call
    input_path  = fetch_input_path
    output_path = Rails.root.join("tmp", "photo_export_#{SecureRandom.hex(8)}.png").to_s

    image = MiniMagick::Image.open(input_path)
    img_w = image.width
    img_h = image.height

    # ── 1. Calques texte ─────────────────────────────────────────────────────
    # Grave chaque calque texte directement sur l'image avec sa couleur et taille
    @layers.select { |l| l.layer_type == "text" }.each do |layer|
      content = layer.annotations.first&.content.to_s
      next if content.blank?

      color     = layer.try(:text_color) || "#ffffff"
      font_size = (layer.try(:font_size) || 28).to_i
      px        = layer.position_x.to_f
      py        = layer.position_y.to_f

      image.combine_options do |c|
        c.font       "DejaVu-Sans-Bold"
        c.pointsize  font_size
        c.fill       color
        c.stroke     "rgba(0,0,0,0.6)"  # Ombre portée pour lisibilité
        c.strokewidth "1"
        c.gravity    "NorthWest"
        c.annotate   "+#{px.round}+#{py.round}", content
      end
    end

    # ── 2. Calques emoji ─────────────────────────────────────────────────────
    # Les emojis nécessitent une image intermédiaire (police Noto Color Emoji)
    # puis sont composités par-dessus la photo principale
    @layers.select { |l| l.layer_type == "emoji" }.each do |layer|
      content = layer.annotations.first&.content.to_s
      next if content.blank?

      px = layer.position_x.to_f
      py = layer.position_y.to_f

      emoji_tmp = Tempfile.new(["emoji", ".png"], Rails.root.join("tmp"))
      begin
        MiniMagick::Tool::Convert.new do |c|
          c.background "transparent"
          c.fill       "white"
          c.font       "Noto-Color-Emoji"
          c.pointsize  "60"
          c << "label:#{content}"
          c << emoji_tmp.path
        end

        if File.exist?(emoji_tmp.path) && File.size(emoji_tmp.path) > 0
          image = image.composite(MiniMagick::Image.open(emoji_tmp.path)) do |c|
            c.compose  "Over"
            c.geometry "+#{(px - 30).round}+#{(py - 30).round}"
          end
        end
      ensure
        emoji_tmp.close
        emoji_tmp.unlink
      end
    end

    # ── 3. Cadre ─────────────────────────────────────────────────────────────
    # Applique le masque de forme et/ou la bordure colorée
    apply_frame(image, img_w, img_h) if @frame_preset

    image.write(output_path)
    output_path
  ensure
    # Nettoyage du fichier source temporaire
    File.delete(@tmp_input_path) if @tmp_input_path && File.exist?(@tmp_input_path.to_s)
  end

  private

  # Télécharge la photo depuis Active Storage par chunks (évite de saturer la RAM)
  # Préserve l'extension originale du fichier (.jpg, .png, etc.)
  def fetch_input_path
    if @media_file.file.attached?
      ext = File.extname(@media_file.file.filename.to_s).presence || ".jpg"
      tmp = Tempfile.new(["src", ext], Rails.root.join("tmp"), binmode: true)
      @media_file.file.download { |chunk| tmp.write(chunk) }
      tmp.flush
      tmp.close
      @tmp_input_path = tmp.path
      tmp.path
    else
      Rails.root.join("public", @media_file.file_path).to_s
    end
  end

  # Orchestre l'application du cadre selon le type (radius ou clip)
  def apply_frame(image, w, h)
    border_color = @frame_color || extract_color_from_preset
    thickness    = @frame_thickness || 3
    clip_type    = @frame_preset["clipType"]  || @frame_preset[:clipType]
    clip_value   = @frame_preset["clipValue"] || @frame_preset[:clipValue]

    case clip_type
    when "radius"
      # Cadres arrondis ou circulaires — on crée un masque blanc sur fond transparent
      radius_px = parse_radius(clip_value, w, h)
      if radius_px >= [w, h].min / 2
        apply_circle_mask(image, w, h)   # Cercle parfait
      elsif radius_px > 0
        apply_rounded_mask(image, w, h, radius_px)  # Coins arrondis
      end
    when "clip"
      # Formes polygonales (étoile, losange, etc.) — on passe par un SVG
      svg_content = polygon_to_svg(clip_value, w, h)
      apply_svg_mask(image, svg_content, w, h) if svg_content
    end

    # Bordure colorée appliquée par-dessus le masque de forme
    brd = @frame_preset["border"] || @frame_preset[:border]
    if brd && border_color
      image.combine_options do |c|
        c.bordercolor border_color
        c.border      "#{thickness}x#{thickness}"
      end
    end
  end

  # Crée un masque circulaire et l'applique sur l'image
  def apply_circle_mask(image, w, h)
    mask = Tempfile.new(["mask", ".png"], Rails.root.join("tmp"))
    begin
      MiniMagick::Tool::Convert.new do |c|
        c.size   "#{w}x#{h}"
        c.canvas "none"
        c.fill   "white"
        c.draw   "circle #{w/2},#{h/2} #{w/2},0"
        c << mask.path
      end
      apply_mask(image, mask.path)
    ensure
      mask.close; mask.unlink
    end
  end

  # Crée un masque avec coins arrondis
  def apply_rounded_mask(image, w, h, radius)
    mask = Tempfile.new(["mask", ".png"], Rails.root.join("tmp"))
    begin
      MiniMagick::Tool::Convert.new do |c|
        c.size   "#{w}x#{h}"
        c.canvas "none"
        c.fill   "white"
        c.draw   "roundrectangle 0,0,#{w-1},#{h-1},#{radius},#{radius}"
        c << mask.path
      end
      apply_mask(image, mask.path)
    ensure
      mask.close; mask.unlink
    end
  end

  # Applique un masque en niveaux de gris sur l'image (blanc = visible, noir = transparent)
  def apply_mask(image, mask_path)
    masked = image.composite(MiniMagick::Image.open(mask_path)) do |c|
      c.alpha   "Off"
      c.compose "CopyOpacity"
    end
    image.destroy!
    image.instance_variable_set(:@path, masked.path)
  end

  # Crée un masque à partir d'un fichier SVG (utilisé pour les polygones)
  def apply_svg_mask(image, svg_content, w, h)
    svg_tmp  = Tempfile.new(["mask", ".svg"], Rails.root.join("tmp"))
    mask_tmp = Tempfile.new(["mask", ".png"], Rails.root.join("tmp"))
    begin
      svg_tmp.write(svg_content)
      svg_tmp.flush
      MiniMagick::Tool::Convert.new do |c|
        c.background "none"
        c << svg_tmp.path
        c.resize "#{w}x#{h}!"
        c << mask_tmp.path
      end
      apply_mask(image, mask_tmp.path)
    ensure
      svg_tmp.close;  svg_tmp.unlink
      mask_tmp.close; mask_tmp.unlink
    end
  end

  # Convertit un polygon CSS clip-path en SVG utilisable par ImageMagick
  # Ex: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" → SVG losange
  def polygon_to_svg(clip_value, w, h)
    return nil unless clip_value&.start_with?("polygon(")
    points_str = clip_value.sub("polygon(", "").sub(")", "")
    points = points_str.split(",").map do |pair|
      px_str, py_str = pair.strip.split
      x = parse_length(px_str, w)
      y = parse_length(py_str, h)
      "#{x},#{y}"
    end.join(" ")
    <<~SVG
      <svg xmlns="http://www.w3.org/2000/svg" width="#{w}" height="#{h}">
        <polygon points="#{points}" fill="white"/>
      </svg>
    SVG
  end

  # Convertit un rayon CSS (%, px) en pixels absolus
  def parse_radius(value, w, h)
    return 0 if value.nil? || value == "0px"
    if value.end_with?("%")
      (value.to_f / 100.0 * [w, h].min).round
    else
      value.to_i
    end
  end

  # Convertit une longueur CSS (%, px) en pixels absolus par rapport à une dimension
  def parse_length(val, total)
    if val&.end_with?("%")
      (val.to_f / 100.0 * total).round
    else
      val.to_i
    end
  end

  # Extrait la couleur hexadécimale depuis le style de bordure du preset
  def extract_color_from_preset
    brd = @frame_preset["border"] || @frame_preset[:border]
    return nil unless brd
    style = brd["style"] || brd[:style] || ""
    style.scan(/#[0-9a-fA-F]{3,6}/).first
  end
end