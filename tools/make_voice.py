#!/usr/bin/env python3
"""Record the walk-through narration with a human-like voice.

1. Load the built index.html and ask it for the exact narration it will speak with today's data and scripts.
2. Record only sentences not recorded before (keyed by a hash of the text and voice), as small MP3 files in audio/tours/.
3. Write audio/manifest.json and remove recordings no longer used.
Without a TTS_API_KEY this step is skipped and the app uses the browser's voice.
"""
import os, sys, json, threading, http.server, functools, asyncio
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'agents'))
import voice as V

def key_for(text, voice):   # FNV-1a, identical to textKey() in the app
    h = 0x811c9dc5
    for b in (' '.join(text.split()) + '|' + voice).encode('utf-8'):
        h ^= b; h = (h * 0x01000193) & 0xffffffff
    return f'{h:08x}'

async def narration(port):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 1440, 'height': 900})).new_page()
        await pg.goto(f'http://localhost:{port}/index.html?welcome=0'); await pg.wait_for_function('window.__tourTexts && typeof boot === "function"', timeout=60000)
        await pg.wait_for_timeout(4000)
        texts = await pg.evaluate('window.__tourTexts()'); await b.close(); return texts

def main():
    cfg = json.loads((ROOT / 'agents/config.json').read_text()).get('voice', {})
    key = os.environ.get('TTS_API_KEY', '')
    if not key and cfg.get('provider') != 'mock': print('No TTS_API_KEY: skipping the recorded voice (the app uses the browser voice).'); return 0
    if os.environ.get('TTS_REGION'): cfg['region'] = os.environ['TTS_REGION']
    tours = json.loads((ROOT / 'data/tours.json').read_text(encoding='utf-8')); cfg['pronounce'] = tours.get('pronounce', {})
    # the pronunciation list is part of the voice key, so changing it re-records the affected sentences
    voice = f"{cfg.get('provider', 'azure')}:{cfg.get('voice', '')}:{key_for(json.dumps(cfg['pronounce'], sort_keys=True), 'p')}"
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler); threading.Thread(target=srv.serve_forever, daemon=True).start()
    try: texts = asyncio.run(narration(srv.server_address[1]))
    finally: srv.shutdown()
    mpath = ROOT / 'audio/manifest.json'
    old = json.loads(mpath.read_text()) if mpath.exists() else {}
    files = dict(old.get('files', {})) if old.get('voice') == voice else {}
    keep, chars, made = {}, 0, 0
    for t in texts:
        if not t['text']: continue
        k = key_for(t['text'], voice); rel = files.get(k) or f"tours/{t['tour']}/{t['step']}-{k}.mp3"
        if (ROOT / 'audio' / rel).exists(): keep[k] = rel; continue
        chars += len(t['text'])
        if chars > cfg.get('maxCharsPerRun', 20000): print('Character limit for this run reached; the rest will be recorded next time.'); break
        try: audio = V.synthesize(t['text'], cfg, key) if cfg.get('provider') != 'mock' else mock_mp3()
        except Exception as e: print(f"Could not record {t['tour']}.{t['step']}: {e}"); continue
        out = ROOT / 'audio' / rel; out.parent.mkdir(parents=True, exist_ok=True); out.write_bytes(audio); keep[k] = rel; made += 1
    for f in (ROOT / 'audio/tours').rglob('*.mp3') if (ROOT / 'audio/tours').exists() else []:   # remove recordings no longer used
        if f.relative_to(ROOT / 'audio').as_posix() not in keep.values(): f.unlink()
    mpath.parent.mkdir(exist_ok=True)
    mpath.write_text(json.dumps({'voice': voice, 'updated': __import__('datetime').date.today().isoformat(), 'files': keep}, indent=1) + '\n')
    print(f'Voice: {made} sentence(s) recorded, {len(keep)} in use ({voice}).'); return 0

def mock_mp3():   # for tests only: one second of silence
    import subprocess, tempfile
    with tempfile.NamedTemporaryFile(suffix='.mp3') as f:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', '1', '-q:a', '9', f.name], check=True)
        return Path(f.name).read_bytes()

if __name__ == '__main__':
    sys.exit(main())
