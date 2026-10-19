#!/usr/bin/env bash
# Builds the single-page preview bundle (used for the shareable preview artifact).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run pipeline:geo >/dev/null
mkdir -p preview/out/data
cp -r public/data/. preview/out/data/
node_modules/.bin/esbuild preview/entry.tsx --bundle --minify --format=iife --target=es2022 \
  --jsx=automatic --define:process.env.NODE_ENV=\"production\" --outfile=preview/out/map.js
