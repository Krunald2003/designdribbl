// Turns the static share build (dist-share/) into one self-contained page,
// share/figiman.html, with the JS, CSS and fonts inlined. The page is written
// without <html>/<head>/<body> tags because the publishing host wraps it.

import fs from "node:fs";
import path from "node:path";

const dist = "dist-share";
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");

const jsHref = html.match(/<script[^>]+src="\.\/(assets\/[^"]+\.js)"/)?.[1];
const cssHref = html.match(/<link[^>]+href="\.\/(assets\/[^"]+\.css)"/)?.[1];
if (!jsHref || !cssHref) throw new Error("Could not find the built JS/CSS in dist-share/index.html");

const js = fs.readFileSync(path.join(dist, jsHref), "utf8").replace(/<\/script/gi, "<\\/script");
let css = fs.readFileSync(path.join(dist, cssHref), "utf8");

// Keep only the woff2 source of each font and embed it as a data URI.
css = css.replace(/,\s*url\([^)]+\.woff\)\s*format\(["']woff["']\)/g, "");
css = css.replace(/url\(\.?\/?([^)"']+\.woff2)\)/g, (_m, file) => {
  const data = fs.readFileSync(path.join(dist, "assets", path.basename(file))).toString("base64");
  return `url(data:font/woff2;base64,${data})`;
});

const page = `<title>Figiman</title>
<meta name="description" content="Roll a dice, recreate a real app screen in Figma, and get an accuracy score for color, typography, spacing and layout.">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;

fs.mkdirSync("share", { recursive: true });
fs.writeFileSync("share/figiman.html", page);
console.log(`share/figiman.html written (${(page.length / 1024).toFixed(0)} KB)`);
