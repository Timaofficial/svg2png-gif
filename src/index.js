// SVG → PNG/GIF для Cloudflare Workers
// Требуется: @cloudflare/puppeteer + [browser] binding + nodejs_compat

import puppeteer from "@cloudflare/puppeteer";

const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SVG → PNG / GIF</title>
<style>
:root{--bg:#1c1c1e;--panel:#232326;--panel-2:#2a2a2e;--border:#3c3c42;--text:#f0f0f0;--text-mute:#a0a0a5;--accent:#5078dc;--accent-h:#6490f0;--danger:#c83c3c;--danger-h:#dc5050;--success:#50c86e;--warning:#e6b43c}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:'Gotham','Segoe UI',system-ui,sans-serif;font-size:14px;line-height:1.4}
header{padding:16px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
header h1{margin:0;font-size:16px;font-weight:700}
header .sub{color:var(--text-mute);font-size:12px}
main{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px;max-width:1400px;margin:0 auto}
@media (max-width:900px){main{grid-template-columns:1fr}}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:10px}
.panel h2{margin:0;font-size:12px;font-weight:700;color:var(--accent);letter-spacing:.06em;text-transform:uppercase}
textarea{width:100%;min-height:260px;background:#141416;color:var(--text);border:1px solid var(--border);border-radius:6px;padding:10px;font-family:'Fira Code','Consolas',monospace;font-size:12px;resize:vertical;outline:none}
textarea:focus{border-color:var(--accent)}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
label{color:var(--text-mute);font-size:12px;min-width:90px}
input[type=number],input[type=text],select{background:#141416;color:var(--text);border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:13px;outline:none}
input[type=number]:focus,input[type=text]:focus,select:focus{border-color:var(--accent)}
input[type=number]{width:80px}
input[type=text]{flex:1;min-width:120px}
button{background:var(--panel-2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s}
button:hover{background:#333338;border-color:#4c4c52}
button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
button.primary:hover{background:var(--accent-h);border-color:var(--accent-h)}
button.danger{background:var(--danger);border-color:var(--danger);color:#fff}
button.danger:hover{background:var(--danger-h);border-color:var(--danger-h)}
button:disabled{opacity:.5;cursor:not-allowed}
.preview{background:#141416;border:1px solid var(--border);border-radius:6px;min-height:260px;display:flex;align-items:center;justify-content:center;padding:16px;background-image:linear-gradient(45deg,#1e1e22 25%,transparent 25%),linear-gradient(-45deg,#1e1e22 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1e1e22 75%),linear-gradient(-45deg,transparent 75%,#1e1e22 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0;overflow:hidden}
.preview img{max-width:100%;max-height:400px;display:block}
.status{font-size:12px;color:var(--text-mute);min-height:16px}
.status.ok{color:var(--success)}.status.err{color:var(--danger)}.status.warn{color:var(--warning)}
.hint{font-size:11px;color:var(--text-mute)}
.format-tabs{display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:4px}
.format-tab{background:transparent;border:none;border-bottom:2px solid transparent;color:var(--text-mute);padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer}
.format-tab.active{color:var(--accent);border-bottom-color:var(--accent)}
.format-tab:hover{color:var(--text)}
.gif-opts{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px;background:#141416;border-radius:6px;border:1px solid var(--border)}
footer{text-align:center;padding:16px;color:var(--text-mute);font-size:11px}
</style>
</head>
<body>
<header>
<h1>SVG → PNG / GIF</h1>
<span class="sub">Cloudflare Worker · Browser Rendering</span>
</header>
<main>
<section class="panel">
<h2>SVG Input</h2>
<textarea id="svgInput" placeholder="&lt;svg xmlns=...&gt;...&lt;/svg&gt;"></textarea>
<div class="row">
<button id="btnPaste" class="primary">Вставить SVG</button>
<button id="btnSample">Пример</button>
<button id="btnSampleAnim">Анимированный пример</button>
<button id="btnClear" class="danger">Очистить</button>
</div>
<div class="row">
<label for="fileInput">Файл SVG:</label>
<input type="file" id="fileInput" accept=".svg,image/svg+xml" multiple>
</div>
<div class="format-tabs">
<button class="format-tab active" data-format="png">PNG</button>
<button class="format-tab" data-format="gif">GIF</button>
</div>
<div class="row">
<label for="inWidth">Ширина:</label>
<input type="number" id="inWidth" value="512" min="1" max="4096">
<label for="inHeight">Высота:</label>
<input type="number" id="inHeight" value="512" min="1" max="4096">
</div>
<div class="row">
<label for="inScale">Масштаб:</label>
<select id="inScale"><option value="1">1x</option><option value="2" selected>2x</option><option value="4">4x</option><option value="8">8x</option></select>
<label for="inBg">Фон:</label>
<select id="inBg"><option value="transparent" selected>Прозрачный</option><option value="white">Белый</option><option value="black">Чёрный</option><option value="custom">Свой цвет</option></select>
<input type="text" id="inBgCustom" value="#5078dc" style="display:none;width:100px;">
</div>
<div class="row">
<label for="inPadding">Отступ:</label>
<input type="number" id="inPadding" value="0" min="0" max="200">
<span class="hint">px от края</span>
</div>
<div class="gif-opts" id="gifOpts" style="display:none;">
<label for="gifFrames" style="min-width:auto;">Кадров:</label>
<input type="number" id="gifFrames" value="20" min="2" max="120">
<label for="gifDuration" style="min-width:auto;">Длительность:</label>
<input type="number" id="gifDuration" value="2000" min="200" max="20000">
<span class="hint">мс</span>
</div>
<div class="row">
<button id="btnConvert" class="primary">Конвертировать</button>
<button id="btnDownload" disabled>Скачать</button>
</div>
<div id="status" class="status"></div>
</section>
<section class="panel">
<h2>Preview</h2>
<div class="preview" id="preview"><span class="hint">Вставь SVG слева</span></div>
<div class="row"><span class="hint" id="previewMeta"></span></div>
</section>
</main>
<footer>Работает через Cloudflare Worker + Browser Rendering</footer>
<script>
(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
var svgInput=$('svgInput'),preview=$('preview'),previewMeta=$('previewMeta'),statusEl=$('status');
var inWidth=$('inWidth'),inHeight=$('inHeight'),inScale=$('inScale'),inBg=$('inBg'),inBgCustom=$('inBgCustom'),inPadding=$('inPadding');
var btnPaste=$('btnPaste'),btnSample=$('btnSample'),btnSampleAnim=$('btnSampleAnim'),btnClear=$('btnClear');
var btnConvert=$('btnConvert'),btnDownload=$('btnDownload'),fileInput=$('fileInput');
var gifOpts=$('gifOpts'),gifFrames=$('gifFrames'),gifDuration=$('gifDuration');
var currentFormat='png',currentBlob=null,currentName='icon';

function setStatus(t,k){statusEl.textContent=t||'';statusEl.className='status'+(k?' '+k:'')}
function getBgColor(){var v=inBg.value;if(v==='transparent')return null;if(v==='white')return '#ffffff';if(v==='black')return '#000000';if(v==='custom')return inBgCustom.value||'#000000';return null}
function getSize(){var w=parseInt(inWidth.value,10)||512,h=parseInt(inHeight.value,10)||512,s=parseInt(inScale.value,10)||1;return{w:Math.max(1,w*s),h:Math.max(1,h*s)}}
function sanitizeSvg(s){s=s.replace(/^\\uFEFF/,'').replace(/<!--[\\s\\S]*?-->/g,'');return s.trim()}
function isLikelySvg(t){return t&&/<svg[\\s>]/i.test(t)&&/<\\/svg>/i.test(t)}
function ensureXmlns(s){if(!/xmlns=/i.test(s))s=s.replace(/<svg\\b/i,'<svg xmlns="http://www.w3.org/2000/svg"');return s}
function ensureViewBox(s){if(/viewBox=/i.test(s))return s;var w=s.match(/<svg[^>]*\\bwidth=["']?([\\d.]+)/i),h=s.match(/<svg[^>]*\\bheight=["']?([\\d.]+)/i);if(w&&h)s=s.replace(/<svg\\b/i,'<svg viewBox="0 0 '+w[1]+' '+h[1]+'"');else s=s.replace(/<svg\\b/i,'<svg viewBox="0 0 24 24"');return s}

function updatePreview(){
  var svg=sanitizeSvg(svgInput.value);preview.innerHTML='';previewMeta.textContent='';
  if(!svg){preview.innerHTML='<span class="hint">Вставь SVG слева</span>';btnConvert.disabled=true;btnDownload.disabled=true;return}
  if(!isLikelySvg(svg)){preview.innerHTML='<span class="hint" style="color:var(--danger)">Не похоже на SVG</span>';btnConvert.disabled=true;btnDownload.disabled=true;return}
  svg=ensureViewBox(ensureXmlns(svg));
  var blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
  img.onload=function(){preview.appendChild(img);previewMeta.textContent=img.naturalWidth+' × '+img.naturalHeight+' (native)';btnConvert.disabled=false;URL.revokeObjectURL(url)};
  img.onerror=function(){URL.revokeObjectURL(url);preview.innerHTML='<span class="hint" style="color:var(--danger)">Невалидный SVG</span>';btnConvert.disabled=true};
  img.src=url;
}

document.querySelectorAll('.format-tab').forEach(function(tab){
  tab.addEventListener('click',function(){
    document.querySelectorAll('.format-tab').forEach(function(t){t.classList.remove('active')});
    tab.classList.add('active');currentFormat=tab.dataset.format;
    gifOpts.style.display=currentFormat==='gif'?'flex':'none';
  });
});

svgInput.addEventListener('input',updatePreview);
inBg.addEventListener('change',function(){inBgCustom.style.display=inBg.value==='custom'?'inline-block':'none'});

btnPaste.addEventListener('click',function(){
  if(!navigator.clipboard||!navigator.clipboard.readText){setStatus('Clipboard API недоступен','warn');svgInput.focus();return}
  navigator.clipboard.readText().then(function(t){svgInput.value=t;updatePreview();setStatus('Вставлено из буфера','ok')}).catch(function(e){setStatus('Не удалось: '+e.message,'err')});
});

btnSample.addEventListener('click',function(){
  svgInput.value='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><path d="M32 6 L54 14 V30 C54 44 44 54 32 59 C20 54 10 44 10 30 V14 Z" fill="#5078dc" fill-opacity="0.12" stroke="#5078dc" stroke-width="2.5" stroke-linejoin="round"/><path d="M22 22 A8 8 0 1 0 22 42" stroke="#5078dc" stroke-width="3" stroke-linecap="round"/><path d="M32 22 V42 M32 22 H36 A4.5 4.5 0 0 1 36 31 H32 M35 31 L40 42" stroke="#5078dc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M50 24 A7 7 0 1 0 50 40" stroke="#5078dc" stroke-width="3" stroke-linecap="round"/></svg>';
  updatePreview();setStatus('Загружен пример: CRC shield','ok');
});

btnSampleAnim.addEventListener('click',function(){
  svgInput.value='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="20" stroke="#5078dc" stroke-width="3"><animate attributeName="r" values="20;26;20" dur="2s" repeatCount="indefinite"/></circle><circle cx="32" cy="32" r="10" fill="#5078dc" fill-opacity="0.3"><animate attributeName="r" values="10;16;10" dur="2s" repeatCount="indefinite"/><animate attributeName="fill-opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite"/></circle></svg>';
  updatePreview();setStatus('Загружен анимированный пример','ok');
});

btnClear.addEventListener('click',function(){svgInput.value='';currentBlob=null;updatePreview();setStatus('')});

fileInput.addEventListener('change',function(){
  var f=fileInput.files&&fileInput.files[0];if(!f)return;
  var r=new FileReader();
  r.onload=function(){svgInput.value=String(r.result);currentName=f.name.replace(/\\.svg$/i,'');updatePreview();setStatus('Загружен: '+f.name,'ok')};
  r.readAsText(f);fileInput.value='';
});

btnConvert.addEventListener('click',async function(){
  var size=getSize(),bg=getBgColor(),pad=parseInt(inPadding.value,10)||0;
  setStatus('Конвертация...','warn');btnConvert.disabled=true;
  try{
    var payload={
      svg:svgInput.value,
      format:currentFormat,
      width:size.w,height:size.h,
      bg:bg||'transparent',
      padding:pad,
      frames:parseInt(gifFrames.value,10)||20,
      duration:parseInt(gifDuration.value,10)||2000
    };
    var res=await fetch('/api/render',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!res.ok){
      var txt=await res.text(),m='HTTP '+res.status;
      try{m=JSON.parse(txt).error||m}catch(e){m=m+' '+txt.slice(0,200)}
      throw new Error(m);
    }
    var blob=await res.blob();
    currentBlob=blob;currentName=(currentName||'icon')+'.'+currentFormat;
    preview.innerHTML='';var img=new Image(),url=URL.createObjectURL(blob);
    img.onload=function(){preview.appendChild(img);previewMeta.textContent=size.w+' × '+size.h+' '+currentFormat.toUpperCase()};
    img.src=url;
    btnDownload.disabled=false;
    setStatus('Готово: '+currentName+', '+Math.round(blob.size/1024)+' KB','ok');
  }catch(e){setStatus('Ошибка: '+e.message,'err')}
  finally{btnConvert.disabled=false}
});

btnDownload.addEventListener('click',function(){
  if(!currentBlob)return;
  var url=URL.createObjectURL(currentBlob),a=document.createElement('a');
  a.href=url;a.download=currentName;document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url)},1000);
});

updatePreview();
})();
</script>
</body>
</html>`;

const enc = new TextEncoder();

function json(data, status, extra) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(extra || {}) },
  });
}

function corsHeaders(env, origin) {
  const allowed = (env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes('*') || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? (origin || '*') : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function clampInt(v, min, max, def) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

function normalizeBg(bg) {
  if (!bg || bg === 'transparent') return null;
  if (bg === 'white') return '#ffffff';
  if (bg === 'black') return '#000000';
  return bg;
}

function validateSvg(svg, maxBytes) {
  if (typeof svg !== 'string' || !svg.trim()) return 'svg: строка обязательна';
  if (enc.encode(svg).length > maxBytes) return 'svg: превышает лимит ' + maxBytes + ' байт';
  if (!/<svg[\s>]/i.test(svg) || !/<\/svg>/i.test(svg)) return 'svg: не похоже на SVG';
  if (/<script|<foreignObject|javascript:/i.test(svg)) return 'svg: недопустимые элементы';
  return null;
}

async function renderInBrowser(env, svg, opts) {
  if (!env.BROWSER) {
    throw new Error('BROWSER binding не подключён. Добавь Browser Run в дашборде с именем BROWSER и передеплой.');
  }

  let browser;
  try {
    browser = await puppeteer.launch(env.BROWSER);
  } catch (e) {
    throw new Error('puppeteer.launch failed: ' + (e && e.message ? e.message : String(e)));
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: opts.w, height: opts.h, deviceScaleFactor: 1 });

    const bgCss = opts.bg ? opts.bg : 'transparent';
    const pad = opts.pad * 2;
    const html = '<!DOCTYPE html><html><head><style>' +
      'html,body{margin:0;padding:0;background:' + bgCss + ';}' +
      '#wrap{width:' + opts.w + 'px;height:' + opts.h + 'px;display:flex;align-items:center;justify-content:center;overflow:hidden;}' +
      '#wrap svg{width:calc(100% - ' + pad + 'px);height:calc(100% - ' + pad + 'px);}' +
      '</style></head><body><div id="wrap">' + svg + '</div></body></html>';

    await page.setContent(html, { waitUntil: 'networkidle0' });

    if (opts.format === 'png') {
      const buf = await page.screenshot({
        type: 'png',
        omitBackground: !opts.bg,
        clip: { x: 0, y: 0, width: opts.w, height: opts.h },
      });
      return { buffer: buf, width: opts.w, height: opts.h };
    }

    const frames = opts.frames;
    const delayMs = opts.duration / frames;
    const shots = [];
    for (let i = 0; i < frames; i++) {
      await new Promise(r => setTimeout(r, delayMs));
      const buf = await page.screenshot({
        type: 'png',
        omitBackground: !opts.bg,
        clip: { x: 0, y: 0, width: opts.w, height: opts.h },
      });
      shots.push(buf);
    }

    const shotsB64 = shots.map(b => {
      const u8 = new Uint8Array(b);
      let s = '';
      for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
      return btoa(s);
    });

    const gifB64 = await page.evaluate(async function(shotsB64, w, h, delayMs) {
      const imgs = await Promise.all(shotsB64.map(function(b64) {
        return new Promise(function(res, rej) {
          const im = new Image();
          im.onload = function() { res(im); };
          im.onerror = rej;
          im.src = 'data:image/png;base64,' + b64;
        });
      }));

      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      const framesData = imgs.map(function(im) {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(im, 0, 0, w, h);
        return ctx.getImageData(0, 0, w, h).data;
      });

      function lzw(indexed, minCodeSize) {
        const clear = 1 << minCodeSize, eoi = clear + 1;
        let codeSize = minCodeSize + 1, dict, next;
        const out = []; let cur = 0, bits = 0;
        const emit = function(c) { cur |= c << bits; bits += codeSize; while (bits >= 8) { out.push(cur & 255); cur >>= 8; bits -= 8; } };
        const reset = function() { dict = new Map(); for (let i = 0; i < clear; i++) dict.set(String.fromCharCode(i), i); next = eoi + 1; codeSize = minCodeSize + 1; };
        reset(); emit(clear);
        let buf = '';
        for (let i = 0; i < indexed.length; i++) {
          const ch = String.fromCharCode(indexed[i]);
          const t = buf + ch;
          if (dict.has(t)) buf = t;
          else { emit(dict.get(buf)); dict.set(t, next++); if (next > (1 << codeSize) && codeSize < 12) codeSize++; if (next > 4095) { emit(clear); reset(); } buf = ch; }
        }
        if (buf) emit(dict.get(buf));
        emit(eoi);
        while (bits > 0) { out.push(cur & 255); cur >>= 8; bits -= 8; }
        return out;
      }
      function buildPalette(samples) {
        const boxes = [{ p: samples }];
        while (boxes.length < 256) {
          let bi = -1, br = -1;
          for (let b = 0; b < boxes.length; b++) {
            const px = boxes[b].p; if (px.length < 2) continue;
            let mnR=255,mxR=0,mnG=255,mxG=0,mnB=255,mxB=0;
            for (let k=0;k<px.length;k++){const p=px[k];if(p[0]<mnR)mnR=p[0];if(p[0]>mxR)mxR=p[0];if(p[1]<mnG)mnG=p[1];if(p[1]>mxG)mxG=p[1];if(p[2]<mnB)mnB=p[2];if(p[2]>mxB)mxB=p[2];}
            const r=(mxR-mnR)+(mxG-mnG)+(mxB-mnB); if (r > br) { br = r; bi = b; }
          }
          if (bi < 0) break;
          const box = boxes[bi];
          let mnR=255,mxR=0,mnG=255,mxG=0,mnB=255,mxB=0;
          for (let k=0;k<box.p.length;k++){const p=box.p[k];if(p[0]<mnR)mnR=p[0];if(p[0]>mxR)mxR=p[0];if(p[1]<mnG)mnG=p[1];if(p[1]>mxG)mxG=p[1];if(p[2]<mnB)mnB=p[2];if(p[2]>mxB)mxB=p[2];}
          const ch = (mxR-mnR) >= (mxG-mnG) && (mxR-mnR) >= (mxB-mnB) ? 0 : (mxG-mnG) >= (mxB-mnB) ? 1 : 2;
          box.p.sort(function(a,b){return a[ch]-b[ch]});
          const mid = box.p.length >> 1;
          boxes.splice(bi, 1, { p: box.p.slice(0, mid) }, { p: box.p.slice(mid) });
        }
        const pal = [];
        for (let b=0;b<boxes.length;b++){const bx=boxes[b];let r=0,g=0,bl=0;for(let k=0;k<bx.p.length;k++){const p=bx.p[k];r+=p[0];g+=p[1];bl+=p[2];}const n=bx.p.length;pal.push([Math.round(r/n),Math.round(g/n),Math.round(bl/n)]);}
        while (pal.length < 256) pal.push([0,0,0]);
        return pal;
      }
      function quant(rgba, w, h, pal) {
        const out = new Uint8Array(w*h);
        for (let i = 0; i < w*h; i++) {
          const r = rgba[i*4], g = rgba[i*4+1], b = rgba[i*4+2];
          let best = 0, bd = Infinity;
          for (let p = 0; p < 256; p++) { const dr=pal[p][0]-r, dg=pal[p][1]-g, db=pal[p][2]-b; const d=dr*dr+dg*dg+db*db; if (d < bd) { bd = d; best = p; } }
          out[i] = best;
        }
        return out;
      }
      const samples = [];
      for (let fi=0;fi<framesData.length;fi++){const f=framesData[fi];for(let i=0;i<w*h;i+=4)samples.push([f[i*4],f[i*4+1],f[i*4+2]]);}
      const palette = buildPalette(samples);

      const bytes = [];
      const pb = function(b) { bytes.push(b & 255); };
      const pa = function(a) { for (let i=0;i<a.length;i++) pb(a[i]); };
      const ps = function(v) { pb(v & 255); pb((v >> 8) & 255); };
      pa([0x47,0x49,0x46,0x38,0x39,0x61]);
      ps(w); ps(h); pb(0xF7); pb(0); pb(0);
      for (let i = 0; i < 256; i++) { const c = palette[i] || [0,0,0]; pb(c[0]); pb(c[1]); pb(c[2]); }
      pa([0x21,0xFF,0x0B,0x4E,0x45,0x54,0x53,0x43,0x41,0x50,0x45,0x32,0x2E,0x30,0x03,0x01,0x00,0x00,0x00]);
      for (let fi=0;fi<framesData.length;fi++){
        const f = framesData[fi];
        pa([0x21,0xF9,0x04,0x04]);
        ps(Math.max(2, Math.round(delayMs / 10)));
        pb(0); pb(0);
        pb(0x2C); ps(0); ps(0); ps(w); ps(h); pb(0);
        const idx = quant(f, w, h, palette);
        const data = lzw(idx, 8);
        pb(8);
        for (let i = 0; i < data.length; i += 255) { const chunk = data.slice(i, i + 255); pb(chunk.length); pa(chunk); }
        pb(0);
      }
      pb(0x3B);

      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    }, shotsB64, opts.w, opts.h, delayMs);

    const bin = Uint8Array.from(atob(gifB64), c => c.charCodeAt(0));
    return { buffer: bin.buffer, width: opts.w, height: opts.h };
  } finally {
    try { await browser.close(); } catch (e) {}
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(env, origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === '/health') {
      return json({
        ok: true,
        service: 'svg-converter',
        browser: !!env.BROWSER,
      }, 200, cors);
    }

    if (url.pathname === '/api/render' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'invalid JSON' }, 400, cors); }

      const maxBytes = parseInt(env.MAX_SVG_BYTES || '1048576', 10);
      const err = validateSvg(body.svg, maxBytes);
      if (err) return json({ error: err }, 400, cors);

      const format = (body.format || 'png').toLowerCase();
      if (format !== 'png' && format !== 'gif') return json({ error: 'format: png | gif' }, 400, cors);

      const w = clampInt(body.width, 1, 2048, 512);
      const h = clampInt(body.height, 1, 2048, 512);
      const bg = normalizeBg(body.bg);
      const pad = clampInt(body.padding, 0, 200, 0);
      const frames = clampInt(body.frames, 1, 60, 20);
      const duration = clampInt(body.duration, 200, 20000, 2000);

      try {
        const out = await renderInBrowser(env, body.svg, {
          w, h, bg, pad, format, frames, duration,
        });
        return new Response(out.buffer, {
          status: 200,
          headers: {
            ...cors,
            'Content-Type': format === 'png' ? 'image/png' : 'image/gif',
            'X-Image-Width': String(out.width),
            'X-Image-Height': String(out.height),
            'Cache-Control': 'no-store',
          },
        });
      } catch (e) {
        return json({
          error: 'render failed: ' + (e && e.message ? e.message : String(e)),
          stack: e && e.stack ? String(e.stack).split('\n').slice(0, 5) : null,
          browser: !!env.BROWSER,
        }, 500, cors);
      }
    }

    return json({ error: 'not found' }, 404, cors);
  },
};
