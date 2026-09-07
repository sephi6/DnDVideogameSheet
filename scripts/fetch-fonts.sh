#!/usr/bin/env bash
# Descarga las fuentes de Google Fonts y las deja auto-alojadas en public/fonts,
# regenerando src/styles/fonts.css con rutas locales.
set -euo pipefail
cd "$(dirname "$0")/.."
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
URL="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Barlow+Condensed:ital,wght@0,600;0,700;1,600&family=Bebas+Neue&display=swap"
mkdir -p public/fonts
tmp="$(mktemp)"
curl -sS -A "$UA" "$URL" -o "$tmp"
for url in $(grep -oE "https://fonts.gstatic.com[^)]+" "$tmp" | sort -u); do
  name=$(echo "$url" | sed -E 's#.*/s/([^/]+)/[^/]+/([^.]+)\.woff2#\1-\2#')
  curl -sS -A "$UA" "$url" -o "public/fonts/${name}.woff2"
  sed -i "s#${url}#/fonts/${name}.woff2#g" "$tmp"
done
{
  echo "/* Fuentes auto-alojadas (SIL Open Font License 1.1): Archivo Black, Barlow Condensed, Bebas Neue."
  echo "   Regenerar con scripts/fetch-fonts.sh si hace falta actualizarlas. */"
  cat "$tmp"
} > src/styles/fonts.css
rm -f "$tmp"
echo "Fuentes actualizadas."
