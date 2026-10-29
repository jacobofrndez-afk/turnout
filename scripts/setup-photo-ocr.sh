#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ "$(uname -s)" != "Darwin" ]; then
  echo 'Offline photo reading requires macOS. A connected AI provider can read photos on other hosts.'
  exit 1
fi
mkdir -p .tmp/photo-ocr/cache
TMPDIR="$PWD/.tmp" swiftc -O -module-cache-path .tmp/photo-ocr/cache scripts/read-menu.swift -o .tmp/photo-ocr/read-menu
echo 'Offline photo reading is ready.'
