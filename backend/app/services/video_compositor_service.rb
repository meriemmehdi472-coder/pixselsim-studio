# app/services/video_compositor_service.rb
# Optimisé pour vitesse maximale sur serveur limité (Render Free)
require "open3"

class VideoCompositorService
  def initialize(media_file, layers, crop: nil, canvas_w: nil, canvas_h: nil, frame_preset: nil, frame_color: nil, frame_thickness: nil)
    @media_file      = media_file
    @layers          = layers
    @crop            = crop
    @canvas_w        = canvas_w
    @canvas_h        = canvas_h
    @frame_preset    = frame_preset
    @frame_color     = frame_color
    @frame_thickness = frame_thickness&.to_i
  end

  def call
    input_path  = fetch_input_path
    output_path = Rails.root.join("tmp", "export_#{SecureRandom.hex(8)}.mp4").to_s

    vf_filters = []

    # ── 1. Crop ──────────────────────────────────────────────────────────────
    if @crop
      x = @crop[:x].to_i; y = @crop[:y].to_i
      w = ((@crop[:w].to_i / 2) * 2); h = ((@crop[:h].to_i / 2) * 2)
      vf_filters << "crop=#{w}:#{h}:#{x}:#{y}"
    end

    # ── 2. Calques texte ─────────────────────────────────────────────────────
    @layers.select { |l| l.layer_type == "text" }.each do |layer|
      content   = layer.annotations.first&.content.to_s
      next if content.blank?

      color     = layer.try(:text_color)&.sub("#", "0x") || "0xffffff"
      font_size = (layer.try(:font_size) || 28).to_i
      px        = layer.position_x.to_f
      py        = layer.position_y.to_f

      safe_text = content.gsub("'", "\\'").gsub(":", "\\:")
      vf_filters << "drawtext=text='#{safe_text}':fontcolor=#{color}:fontsize=#{font_size}:x=#{px.round}:y=#{py.round}:box=1:boxcolor=black@0.5:boxborderw=6:font=DejaVu-Sans-Bold"
    end

    # ── 3. Cadre / forme ─────────────────────────────────────────────────────
    if @frame_preset
      frame_filter = build_frame_filter
      vf_filters << frame_filter if frame_filter
    end

    # ── 4. Construire la commande ffmpeg ─────────────────────────────────────
    cmd = ["ffmpeg", "-y", "-i", input_path]

    if vf_filters.any?
      cmd += ["-vf", vf_filters.join(",")]
    end

    cmd += [
      "-threads", "0",          # utilise tous les CPU dispo
      "-c:v", "libx264",
      "-preset", "ultrafast",   # encodage le plus rapide
      "-tune",   "fastdecode",
      "-crf",    "28",          # qualité un peu réduite mais 2x plus vite
      "-c:a",    "copy",        # audio sans ré-encodage
      "-movflags", "+faststart",
      output_path
    ]

    Rails.logger.info("[VideoCompositorService] CMD: #{cmd.join(' ')}")
    stdout, stderr, status = Open3.capture3(*cmd)

    unless status.success?
      Rails.logger.error("[VideoCompositorService] ffmpeg stderr:\n#{stderr}")
      raise "ffmpeg failed: #{stderr.last(500)}"
    end

    output_path
  ensure
    File.delete(@tmp_input_path) if @tmp_input_path && File.exist?(@tmp_input_path.to_s)
  end

  private

  # Streaming par chunks pour éviter de charger toute la vidéo en RAM
  def fetch_input_path
    if @media_file.file.attached?
      tmp = Tempfile.new(["src", ".mp4"], Rails.root.join("tmp"), binmode: true)
      @media_file.file.download { |chunk| tmp.write(chunk) }
      tmp.flush
      tmp.close
      @tmp_input_path = tmp.path
      tmp.path
    else
      Rails.root.join("public", @media_file.file_path).to_s
    end
  end

  # Construit un filtre ffmpeg pour le cadre
  def build_frame_filter
    clip_type  = @frame_preset["clipType"]  || @frame_preset[:clipType]
    clip_value = @frame_preset["clipValue"] || @frame_preset[:clipValue]
    color      = (@frame_color || extract_preset_color || "#ffffff").sub("#", "0x")
    thickness  = @frame_thickness || 3

    case clip_type
    when "radius"
      if clip_value == "50%"
        return "vignette=angle=PI/4"
      end
      build_rounded_overlay_filter(clip_value, color, thickness)

    when "clip"
      build_polygon_border_filter(clip_value, color, thickness)

    else
      nil
    end
  end

  def build_rounded_overlay_filter(radius_val, color, thickness)
    "drawbox=x=0:y=0:w=iw:h=ih:color=#{color}@1.0:t=#{thickness}"
  end

  def build_polygon_border_filter(clip_value, color, thickness)
    "drawbox=x=0:y=0:w=iw:h=ih:color=#{color}@1.0:t=#{thickness}"
  end

  def extract_preset_color
    brd = @frame_preset["border"] || @frame_preset[:border]
    return nil unless brd
    style = brd["style"] || brd[:style] || ""
    style.scan(/#[0-9a-fA-F]{3,6}/).first
  end
end