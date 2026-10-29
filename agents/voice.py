"""Text-to-speech providers for the walk-through narration. The API key comes from the TTS_API_KEY environment variable
(a GitHub secret); it is never written to the repository or the web page."""
import json, base64, html, re, urllib.request

def _post(url, body, headers, timeout=60):
    req = urllib.request.Request(url, data=body, headers=headers, method='POST')
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def azure(text, cfg, key):
    """Microsoft Azure AI Speech: British English neural voices such as en-GB-SoniaNeural or en-GB-LibbyNeural."""
    region, voice = cfg.get('region', 'uksouth'), cfg.get('voice', 'en-GB-SoniaNeural')
    body = html.escape(text)
    for word, said in (cfg.get('pronounce') or {}).items():   # spoken forms, e.g. DESNZ as one word, using Azure's substitution tag
        body = re.sub(r'\b' + re.escape(word) + r'\b', f"<sub alias='{html.escape(said)}'>{word}</sub>", body)
    ssml = f"<speak version='1.0' xml:lang='en-GB'><voice name='{voice}'><prosody rate='{cfg.get('rate', '0%')}'>{body}</prosody></voice></speak>"
    return _post(f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1', ssml.encode('utf-8'),
                 {'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'shrinking-gap-tours'})

def google(text, cfg, key):
    """Google Cloud Text-to-Speech, for example en-GB-Neural2-C."""
    body = {'input': {'text': text}, 'voice': {'languageCode': 'en-GB', 'name': cfg.get('voice', 'en-GB-Neural2-C')}, 'audioConfig': {'audioEncoding': 'MP3'}}
    out = json.loads(_post(f'https://texttospeech.googleapis.com/v1/text:synthesize?key={key}', json.dumps(body).encode(), {'Content-Type': 'application/json'}))
    return base64.b64decode(out['audioContent'])

def elevenlabs(text, cfg, key):
    """ElevenLabs: set voice to the id of a British English female voice from your voice library."""
    body = {'text': text, 'model_id': cfg.get('model', 'eleven_multilingual_v2')}
    return _post(f"https://api.elevenlabs.io/v1/text-to-speech/{cfg['voice']}", json.dumps(body).encode(), {'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})

def openai(text, cfg, key):
    """OpenAI text-to-speech; the instructions ask for a British accent."""
    body = {'model': cfg.get('model', 'gpt-4o-mini-tts'), 'voice': cfg.get('voice', 'nova'), 'input': text, 'response_format': 'mp3',
            'instructions': cfg.get('instructions', 'Speak in a warm, clear British English accent, at a measured pace, like a documentary narrator.')}
    return _post('https://api.openai.com/v1/audio/speech', json.dumps(body).encode(), {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})

PROVIDERS = {'azure': azure, 'google': google, 'elevenlabs': elevenlabs, 'openai': openai}

def synthesize(text, cfg, key):
    provider = cfg.get('provider', 'azure')
    if provider != 'azure':   # other services: substitute the spoken forms in the text itself
        for word, said in (cfg.get('pronounce') or {}).items(): text = re.sub(r'\b' + re.escape(word) + r'\b', said, text)
    return PROVIDERS[provider](text, cfg, key)
