#!/bin/bash
#
# Compila o app para TV em dist-tv/ (nvnplus.js + nvnplus.css + manifesto.json).
# Usado por montar_tv.sh (pacotes .wgt/.ipk) e por publicar_site.sh (que publica o
# mesmo código em /tv/, de onde o carregador do pacote o baixa ao abrir).
set -euo pipefail
cd "$(dirname "$0")/.."
VERSAO="$(node -p "require('./package.json').version")"
echo "==> compilando o app para TV ($VERSAO)"
./node_modules/.bin/tsc -b
./node_modules/.bin/vite build --mode tv >/dev/null
# ES5 para TV antiga/fraca (Chromium 38+), conferido com acorn.
node scripts/tv_es5.mjs dist-tv/nvnplus.js
node -e '
const fs = require("fs"), crypto = require("crypto");
const v = process.argv[1];
const h = crypto.createHash("sha256").update(fs.readFileSync("dist-tv/nvnplus.js")).digest("hex").slice(0, 10);
fs.writeFileSync("dist-tv/manifesto.json", JSON.stringify({ versao: v + "-" + h, js: "nvnplus.js", css: "nvnplus.css", minimoCasca: 1 }));
' "$VERSAO"
rm -rf dist-tv/assets   # o worker do guia vai embutido no nvnplus.js
