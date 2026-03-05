# app/services/photo_export_service.rb
#
# Exporte une photo avec :
#   - les calques texte / emoji gravés (MiniMagick)
#   - le cadre appliqué (clip-path simulé via mask ou border)
#
# Dépendances gem : mini_magick
#
require "mini_magick"
require "open3"

class PhotoExportService
  # frame_preset : hash { clipType, clipValue, border: { style, glow, ... } }
  def initialize(media_file, layers, frame_preset: nil, frame_color: nil, frame_thickness: nil)
    @media_file      = media_file
    @layers          = layers
    @frame_preset    = frame_preset
    @frame_color     = frame_color
    @frame_thickness = frame_thickness&.to_i
  end

  def call
    input_path  = fetch_input_path
    output_path = Rails.root.join("tmp", "photo_export_#{SecureRandom.hex(8)}.png").to_s

    image = MiniMagick::Image.open(input_path)
    img_w = image.width
    img_h = image.height

    # ── 1. Dessiner les calques texte ────────────────────────────────────────
    @layers.select { |l| l.layer_type == "text" }.each do |layer|
      content    = layer.annotations.first&.content.to_s
      next if content.blank?

      color     = layer.try(:text_color) || "#ffffff"
      font_size = (layer.try(:font_size) || 28).to_i
      px        = layer.position_x.to_f
      py        = layer.position_y.to_f

      image.combine_options do |c|
        c.font      "DejaVu-Sans-Bold"
        c.pointsize font_size
        c.fill      color
        c.stroke    "rgba(0,0,0,0.6)"
        c.strokewidth "1"
        c.gravity  "NorthWest"
        c.annotate "+#{px.round}+#{py.round}", content
      end
    end

    # ── 2. Dessiner les calques emoji (via label: trick) ─────────────────────
    @layers.select { |l| l.layer_type == "emoji" }.each do |layer|
      content = layer.annotations.first&.content.to_s
      next if content.blank?
      px = layer.position_x.to_f
      py = layer.position_y.to_f

      # Créer une image emoji temporaire avec ImageMagick
      emoji_path = Rails.root.join("tmp", "emoji_#{SecureRandom.hex(4)}.png").to_s
      MiniMagick::Tool::Convert.new do |c|
        c.background "transparent"
        c.fill       "white"
        c.font       "Noto-Color-Emoji"
        c.pointsize  "60"
        c << "label:#{content}"
        c << emoji_path
      end

      if File.exist?(emoji_path)
        image = image.composite(MiniMagick::Image.open(emoji_path)) do |c|
          c.compose "Over"
          c.geometry "+#{(px - 30).round}+#{(py - 30).round}"
        end
        File.delete(emoji_path)
      end
    end

    # ── 3. Appliquer le cadre ────────────────────────────────────────────────
    if @frame_preset
      apply_frame(image, img_w, img_h)
    end

    image.write(output_path)
    output_path
  ensure
    File.delete(@tmp_input_path) if @tmp_input_path && File.exist?(@tmp_input_path.to_s)
  end

  private

  def fetch_input_path
    if @media_file.file.attached?
      tmp = Tempfile.new(["src", ".jpg"], Rails.root.join("tmp"), binmode: true)
      tmp.write(@media_file.file.download)
      tmp.flush
      @tmp_input_path = tmp.path
      tmp.path
    else
      Rails.root.join("public", @media_file.file_path).to_s
    end
  end

  def apply_frame(image, w, h)
    border_color = @frame_color || extract_color_from_preset
    thickness    = @frame_thickness || 3
    clip_type    = @frame_preset["clipType"]  || @frame_preset[:clipType]
    clip_value   = @frame_preset["clipValue"] || @frame_preset[:clipValue]

    case clip_type
    when "radius"
      # Arrondir les coins via un masque
      radius_px = parse_radius(clip_value, w, h)
      if radius_px >= [w, h].min / 2
        # Cercle parfait
        apply_circle_mask(image, w, h)
      elsif radius_px > 0
        apply_rounded_mask(image, w, h, radius_px)
      end

    when "clip"
      # Formes polygon : on applique via un mask SVG
      svg_path = polygon_to_svg(clip_value, w, h)
      apply_svg_mask(image, svg_path, w, h) if svg_path
    end

    # Bordure colorée par-dessus
    brd = @frame_preset["border"] || @frame_preset[:border]
    if brd && border_color
      image.combine_options do |c|
        c.bordercolor border_color
        c.border      "#{thickness}x#{thickness}"
      end
    end
  end

  def apply_circle_mask(image, w, h)
    r    = [w, h].min / 2
    mask = Tempfile.new(["mask", ".png"], Rails.root.join("tmp"))
    MiniMagick::Tool::Convert.new do |c|
      c.size    "#{w}x#{h}"
      c.canvas  "none"
      c.fill    "white"
      c.draw    "circle #{w/2},#{h/2} #{w/2},0"
      c << mask.path
    end
    apply_mask(image, mask.path)
  ensure
    mask&.close; mask&.unlink
  end

  def apply_rounded_mask(image, w, h, radius)
    mask = Tempfile.new(["mask", ".png"], Rails.root.join("tmp"))
    MiniMagick::Tool::Convert.new do |c|
      c.size   "#{w}x#{h}"
      c.canvas "none"
      c.fill   "white"
      c.draw   "roundrectangle 0,0,#{w-1},#{h-1},#{radius},#{radius}"
      c << mask.path
    end
    apply_mask(image, mask.path)
  ensure
    mask&.close; mask&.unlink
  end

  def apply_mask(image, mask_path)
    masked = image.composite(MiniMagick::Image.open(mask_path)) do |c|
      c.alpha  "Off"
      c.compose "CopyOpacity"
    end
    image.destroy!
    image.instance_variable_set(:@path, masked.path)
  end

  def apply_svg_mask(image, svg_content, w, h)
    svg_tmp  = Tempfile.new(["mask", ".svg"], Rails.root.join("tmp"))
    mask_tmp = Tempfile.new(["mask", ".png"], Rails.root.join("tmp"))
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
    svg_tmp&.close; svg_tmp&.unlink
    mask_tmp&.close; mask_tmp&.unlink
  end

  # Convertit un polygon CSS en SVG blanc sur fond transparent
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

  def parse_radius(value, w, h)
    return 0 if value.nil? || value == "0px"
    if value.end_with?("%")
      pct = value.to_f / 100.0
      (pct * [w, h].min).round
    else
      value.to_i
    end
  end

  def parse_length(val, total)
    if val&.end_with?("%")
      (val.to_f / 100.0 * total).round
    else
      val.to_i
    end
  end

  def extract_color_from_preset
    brd = @frame_preset["border"] || @frame_preset[:border]
    return nil unless brd
    style = brd["style"] || brd[:style] || ""
    style.scan(/#[0-9a-fA-F]{3,6}/).first
  end
end