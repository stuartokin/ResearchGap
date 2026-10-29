#!/usr/bin/env python3
"""Embed data/data.json (and data/tours.json, the walk-through scripts) into index.html as the offline snapshot.
The page still prefers a newer data/data.json when served online."""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def main():
    data = json.loads((ROOT / 'data/data.json').read_text(encoding='utf-8'))
    blob = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    new, n = re.subn(r'/\*DATA-START\*/.*?/\*DATA-END\*/', lambda m: '/*DATA-START*/' + blob + '/*DATA-END*/', html, count=1, flags=re.S)
    if n != 1:
        print('ERROR: data markers not found in index.html'); return 1
    tours_path = ROOT / 'data/tours.json'
    if tours_path.exists():   # the walk-through scripts, embedded for offline use
        tblob = json.dumps(json.loads(tours_path.read_text(encoding='utf-8')), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
        new, n2 = re.subn(r'/\*TOURS-START\*/.*?/\*TOURS-END\*/', lambda m: '/*TOURS-START*/' + tblob + '/*TOURS-END*/', new, count=1, flags=re.S)
        if n2 != 1: print('ERROR: tour markers not found in index.html'); return 1
    # The JSON script tag must contain only JSON, so strip the marker comments when parsing in the page
    (ROOT / 'index.html').write_text(new, encoding='utf-8')
    print(f"Embedded data revision {data['meta']['revision']} ({len(data['milestones'])} milestones, {len(blob)//1024} KB)")
    return 0

if __name__ == '__main__':
    sys.exit(main())
