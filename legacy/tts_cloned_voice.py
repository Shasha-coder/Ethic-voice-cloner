import requests
import base64

# ================== CONFIG ==================
API_KEY = "PASTE_YOUR_DASHSCOPE_API_KEY_HERE"   # ← Paste your full key
VOICE_ID = "qwen-omni-vc-Beton-voice-20260604200640147-7c2f"

# Use Omni model because your voice ID starts with "qwen-omni-vc"
MODEL = "qwen3.5-omni-plus-realtime"
# ===========================================

def text_to_speech(text, output_file="beton_test.wav"):
    print("🎙️ Generating speech with cloned voice...")

    url = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"

    payload = {
        "model": MODEL,
        "input": {
            "text": text,
            "voice": VOICE_ID
        }
    }

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        result = response.json()
        audio_base64 = result["output"]["audio"]["data"]
        audio_bytes = base64.b64decode(audio_base64)

        with open(output_file, "wb") as f:
            f.write(audio_bytes)
        print(f"✅ SUCCESS! Saved as: {output_file}")
    else:
        print(f"❌ Failed ({response.status_code})")
        print(response.text)

# ================== TEST ==================
if __name__ == "__main__":
    test_text = "Bonjour, je suis Beton. Test de ma voix clonée avec le bon modèle Omni."

    text_to_speech(test_text)