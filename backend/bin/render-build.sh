#!/usr/bin/env bash
set -o errexit

# Installer ffmpeg
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o /tmp/ffmpeg.tar.xz
mkdir -p /tmp/ffmpeg
tar -xf /tmp/ffmpeg.tar.xz -C /tmp/ffmpeg --strip-components=1
cp /tmp/ffmpeg/ffmpeg /opt/render/project/bin/ffmpeg
cp /tmp/ffmpeg/ffprobe /opt/render/project/bin/ffprobe
export PATH="/opt/render/project/bin:$PATH"

bundle install
bundle exec rails db:migrate
