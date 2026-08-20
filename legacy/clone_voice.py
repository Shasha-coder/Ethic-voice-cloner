
import requests
import base64
import json

# ================== CONFIG ==================
API_KEY = "PASTE_YOUR_DASHSCOPE_API_KEY_HERE"          # ← CHANGE THIS
AUDIO_FILE = "homme_pub.mp3"                  # ← Your audio file name
VOICE_NAME = "French_manpub02"                 # Name you want
TARGET_MODEL = "qwen3.5-omni-flash-realtime" 
# ===========================================

print("🔄 Cloning voice...")

with open(AUDIO_FILE, "rb") as f:
    audio_data = base64.b64encode(f.read()).decode('utf-8')

url = "https://dashscope-intl.aliyuncs.com/api/v1/services/audio/tts/customization"

payload = {
    "model": "qwen-voice-enrollment",
    "input": {
        "action": "create",
        "target_model": TARGET_MODEL,
        "preferred_name": VOICE_NAME,
        "audio": {
            # "data": f"data:audio/wav;base64,{audio_data}"
            "data": f"data:audio/mp3;base64,{audio_data}"
        }
    }
}

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

if response.status_code == 200:
    result = response.json()
    print("\n✅ Full Response:")
    print(json.dumps(result, indent=2))
    
    # Extract Voice ID
    output = result.get('output', {})
    voice_id = output.get('voice_id') or output.get('voice') or output.get('id')
    
    if voice_id:
        print("\n🎉 SUCCESS!")
        print(f"Voice Name : {VOICE_NAME}")
        print(f"Voice ID   : {voice_id}")
        print("\nCopy the Voice ID above!")
    else:
        print("\n⚠️ Success but Voice ID not found in response")
        print("Output:", output)
else:
    print(f"❌ Failed (Status {response.status_code})")
    print(response.text)