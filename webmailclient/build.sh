#!/usr/bin/env bash
set -euo pipefail

# —— adjust these to your project paths ——
BUILD_DIR="dist"
ASSETS_DIR="$BUILD_DIR/assets"

# list of template directories
TEMPLATE_DIRS=( \
  "/Users/apple/Desktop/Backend_v2/webmail_app/templates" \
  "/Users/apple/Desktop/CodeEssence/webmail_app/templates" \
)
# list of static directories (one per template dir)
STATIC_DIRS=( \
  "/Users/apple/Desktop/Backend_v2/webmail_app/static" \
  "/Users/apple/Desktop/CodeEssence/webmail_app/static" \
)
# --------------------------------------------

echo "🛠 Building Vite…"
npm run build

# 1) Copy + prepare index.html in each app
for TPL_DIR in "${TEMPLATE_DIRS[@]}"; do
  echo "📄 Copying index.html → $TPL_DIR/index.html"
  cp "$BUILD_DIR/index.html" "$TPL_DIR/index.html"
  INDEX_HTML="$TPL_DIR/index.html"

  echo "🔧 Prepending '{% load static %}'…"
  sed -i '' '1i\
{% load static %}' "$INDEX_HTML"

  echo "🔧 Injecting <base> tag…"
  sed -i '' '/<head>/a\
    <base href="{{ base_url|default:'\''/'\'' }}" />' "$INDEX_HTML"
done

# 2) Process each asset and update both apps
echo "✨ Processing assets…"
for src in "$ASSETS_DIR"/*.{css,js}; do
  [[ -e "$src" ]] || continue

  file=$(basename "$src")       # e.g. index-DtKfIngr.css
  ext="${file##*.}"             # css or js
  name="${file%.*}"             # index-DtKfIngr

  if [[ "$name" == *-* ]]; then
    base="${name%-*}"           # strip hash → index
  else
    base="$name"
  fi

  clean="$base.$ext"            # e.g. index.css

  # copy to each static dir
  for STA_DIR in "${STATIC_DIRS[@]}"; do
    mkdir -p "$STA_DIR"
    echo "  • Copying $file → $STA_DIR/$clean"
    cp "$src" "$STA_DIR/$clean"
  done

  # update references in each index.html
  for TPL_DIR in "${TEMPLATE_DIRS[@]}"; do
    INDEX_HTML="$TPL_DIR/index.html"
    sed -i '' -E "s|href=\"[^\"]*$file\"|href=\"{% static '$clean' %}\"|g" "$INDEX_HTML"
    sed -i '' -E "s|src=\"[^\"]*$file\"|src=\"{% static '$clean' %}\"|g" "$INDEX_HTML"
  done
done

echo "✅ Deploy + template patch complete!"
