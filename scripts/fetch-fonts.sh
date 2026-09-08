#!/usr/bin/env bash
# Downloads the fonts from Google Fonts and self-hosts them in public/fonts,
# regenerating src/styles/fonts.css with local paths.
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
  echo "/* Self-hosted fonts (SIL Open Font License 1.1): Archivo Black, Barlow Condensed, Bebas Neue."
  echo "   Regenerate with scripts/fetch-fonts.sh if they need updating. */"
  cat "$tmp"
} > src/styles/fonts.css
rm -f "$tmp"
echo "Fonts updated."
