"""Build the AI-enhanced version: ai/index.html is the standard index.html plus the experimental features that pass
the checks below. Features come from the experimental/ folder (on the experimental branch; the workflows fetch it).

    python tools/build_ai.py [--exp experimental] [--skip feature-id ...]

Each feature is experimental/features/<id>/ with feature.js (required), README.md (required) and style.css (optional),
listed in experimental/manifest.json. A feature that fails a check is left out, and the reason is reported; the AI-enhanced
version is always built, so the switch always works (with no features it matches the standard version)."""
import argparse, datetime, html, json, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
ID_RX = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')
MAX_JS, MAX_CSS, MAX_TOTAL = 40_000, 15_000, 200_000
FORBIDDEN = [
    (r'\bfetch\s*\(|XMLHttpRequest|\bWebSocket\b|\bEventSource\b|sendBeacon', 'network access'),
    (r'\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(|\bsetTimeout\s*\(\s*[\'"`]|\bsetInterval\s*\(\s*[\'"`]', 'running code from text'),
    (r'\bimport\s*\(|\bimportScripts\b|\brequire\s*\(', 'loading other code'),
    (r'<\s*/?\s*script', 'script tags'),
    (r'localStorage|sessionStorage|indexedDB|document\.cookie|caches\.', 'browser storage'),
    (r'window\.open|location\s*\.\s*(href|assign|replace|reload)|\blocation\s*=|history\.(push|replace)State', 'navigation'),
    (r'https?:|//[a-z0-9.-]+\.[a-z]{2,}', 'outside addresses'),
    (r'@import|url\s*\(', 'outside styles or images'),
    (r'document\.write|\bpostMessage\b|\bWorker\b|serviceWorker|navigator\.(clipboard|geolocation|mediaDevices)', 'restricted browser features'),
    (r'aiBanner|aiNews|aiBack|#disc\b|[\'"]disc[\'"]|discAbout|wAck|qInsight|aiversion|SG_AI|__tourTexts|SGX_EMIT', 'touching the AI notices or the app internals'),
]
def check_code(text, kind):
    for rx, why in FORBIDDEN:
        if kind == 'css' and why in ('running code from text', 'loading other code'): continue
        m = re.search(rx, text, re.I)
        if m: return f'{why} ({m.group(0)[:30]!r})'
    return ''
def md_to_html(md):
    out, in_list = [], False
    for line in md.splitlines():
        t = line.strip()
        if t.startswith('- '):
            if not in_list: out.append('<ul>'); in_list = True
            out.append(f'<li>{html.escape(t[2:])}</li>'); continue
        if in_list: out.append('</ul>'); in_list = False
        if t.startswith('#'): out.append(f'<h3>{html.escape(t.lstrip("#").strip())}</h3>')
        elif t: out.append(f'<p>{html.escape(t)}</p>')
    if in_list: out.append('</ul>')
    return '\n'.join(out)
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--exp', default=str(ROOT / 'experimental')); ap.add_argument('--skip', nargs='*', default=[]); a = ap.parse_args()
    exp = pathlib.Path(a.exp); base = (ROOT / 'index.html').read_text(encoding='utf-8')
    manifest = {'features': []}; report, scripts, total = [], [], 0
    if (exp / 'manifest.json').exists():
        try: manifest = json.loads((exp / 'manifest.json').read_text(encoding='utf-8'))
        except Exception as e: report.append(f'manifest.json unreadable: {e}; building with no features')
    else: report.append('no experimental folder: building with no features')
    kept = []
    for f in manifest.get('features', []):
        fid = str(f.get('id', ''))
        def reject(why): report.append(f'left out {fid or "(no id)"}: {why}')
        if not ID_RX.match(fid) or len(fid) > 40: reject('its id must be lower-case words joined by hyphens'); continue
        if f.get('status', 'active') != 'active': report.append(f'left out {fid}: marked {f.get("status")}'); continue
        if fid in a.skip: reject('it failed when loaded, so it is paused'); continue
        if not all(str(f.get(k, '')).strip() for k in ('title', 'description', 'added')): reject('the manifest needs a title, description and date added'); continue
        d = exp / 'features' / fid; js, css, readme = d / 'feature.js', d / 'style.css', d / 'README.md'
        if not js.exists(): reject('feature.js is missing'); continue
        if not readme.exists() or len(readme.read_text(encoding='utf-8').strip()) < 80: reject('README.md is missing or too short: every feature must be documented'); continue
        code = js.read_text(encoding='utf-8'); style = css.read_text(encoding='utf-8') if css.exists() else ''
        if len(code) > MAX_JS or len(style) > MAX_CSS: reject('it is larger than the size limit'); continue
        why = check_code(code, 'js') or check_code(style, 'css')
        if why: reject(f'not allowed: {why}'); continue
        if total + len(code) + len(style) > MAX_TOTAL: reject('the experimental features together are over the size limit'); continue
        total += len(code) + len(style)
        scripts.append(f'<script>/* experimental feature: {fid} */(window.SG_AI.queue = window.SG_AI.queue || []).push({{id:{json.dumps(fid)}, run:function(SGX){{"use strict";\n{code}\n}}}});</script>')
        if style: scripts.append(f'<style data-feature="{fid}">\n{style}\n</style>')
        kept.append({k: f.get(k) for k in ('id', 'title', 'description', 'added', 'updated')}); report.append(f'included {fid}')
    news = (exp / 'WHATS_NEW.md').read_text(encoding='utf-8') if (exp / 'WHATS_NEW.md').exists() else ''
    meta = {'base': '../', 'built': datetime.datetime.now(datetime.timezone.utc).strftime('%d %b %Y, %H:%M UTC'), 'features': kept, 'whatsNew': md_to_html(news)[:20000], 'status': {}, 'queue': []}
    head = f'<script>window.SG_AI = {json.dumps(meta, ensure_ascii=False)};</script>\n' + '\n'.join(scripts)   # before the app's own code, which may start as soon as its data is ready
    out = base.replace('<head>', '<head>\n' + head, 1)
    (ROOT / 'ai').mkdir(exist_ok=True); (ROOT / 'ai/index.html').write_text(out, encoding='utf-8')
    (ROOT / 'ai/features.json').write_text(json.dumps({'built': meta['built'], 'features': kept, 'report': report}, indent=1, ensure_ascii=False), encoding='utf-8')
    print('AI-enhanced version built:', len(kept), 'feature(s).'); [print('  ' + r) for r in report]
    return 0
if __name__ == '__main__': sys.exit(main())
