#!/usr/bin/env bash
set -o errexit

# Installer ffmpeg
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o /tmp/ffmpeg.tar.xz
mkdir -p /tmp/ffmpeg-bin
tar -xf /tmp/ffmpeg.tar.xz -C /tmp/ffmpeg-bin --strip-components=1
mkdir -p $HOME/bin
cp /tmp/ffmpeg-bin/ffmpeg $HOME/bin/ffmpeg
cp /tmp/ffmpeg-bin/ffprobe $HOME/bin/ffprobe
export PATH="$HOME/bin:$PATH"

bundle install
bundle exec rails db:migrate
