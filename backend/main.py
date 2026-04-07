import os, json, base64
from groq import Groq
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

FABRIC_SCORES = {
    "Kasmir": 95, "Ipek": 90, "Keten": 85, "Pamuk": 80, "Yun": 78,
    "Bambu": 65, "Tencel": 60, "Viskon": 55, "Modal": 50, "Elastan": 40,
    "Akrilik": 30, "Polyester": 25, "Naylon": 20,
}

PROMPT = """Bu bir kiyafet etiketi fotografi. Kumas kompozisyonunu ve fiyati oku.
SADECE JSON yaz, baska bir sey yazma, markdown kullanma.
{"fabrics":[{"name":"Pamuk","pct":59}],"price":2490,"product":"Pantolon","raw_text":"okunan metin"}
Kumas isimlerini sunlardan sec: Kasmir,Ipek,Keten,Pamuk,Yun,Bambu,Tencel,Viskon,Modal,Elastan,Akrilik,Polyester,Naylon
Ingilizce ise Turkceye cevir. Fiyat yoksa price:null yaz."""


def calculate_scores(fabrics, price):
    quality = sum(
        (f.get("pct", 0) / 100) * FABRIC_SCORES.get(f.get("name", ""), 0)
        for f in fabrics
    )
    value = (quality / price * 1000) if price and price > 0 else 0
    return round(quality, 1), round(value, 1)


@app.post("/scan")
async def scan(file: UploadFile = File(...)):
    contents = await file.read()
    b64 = base64.b64encode(contents).decode()
    media_type = file.content_type or "image/jpeg"
    try:
        resp = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{b64}"}},
                    {"type": "text", "text": PROMPT}
                ]
            }],
            max_tokens=500,
        )
        text = resp.choices[0].message.content.replace("```json", "").replace("```", "").strip()
        result = json.loads(text)
    except Exception as e:
        raise HTTPException(502, f"Hata: {str(e)[:200]}")

    fabrics = result.get("fabrics", [])
    price = result.get("price")
    quality, value = calculate_scores(fabrics, price)
    return {**result, "quality_score": quality, "value_score": value, "method": "groq"}


@app.get("/health")
async def health():
    return {"status": "ok"}
