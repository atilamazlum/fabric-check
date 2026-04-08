# Fabric Check

Kiyafet etiketini tara, kumas kalitesini ve fiyat degerini ogren.

Kullanici kiyafetin etiketini kamerayla tarar veya fotograf cekerken yapay zeka etiketteki kumas icerigini ve fiyati okur, ardindan kalite/fiyat oranina gore bir deger puani verir.

Canli demo: https://fabric-check.onrender.com

## Nasil calisiyor

1. Etiketi kamerayla tara veya fotograf yukle
2. Groq Vision API etiketteki kumas ve fiyat bilgisini okur
3. Kumas turlerine gore kalite puani hesaplanir
4. Kalite/fiyat orani uzerinden deger skoru verilir

## Kumas puanlari

| Kumas | Puan |
|-------|------|
| Kasmir | 95 |
| Ipek | 90 |
| Keten | 85 |
| Pamuk | 80 |
| Yun | 78 |
| Bambu | 65 |
| Tencel | 60 |
| Viskon | 55 |
| Modal | 50 |
| Elastan | 40 |
| Akrilik | 30 |
| Polyester | 25 |
| Naylon | 20 |

## Formul

```
Kalite = toplam(kumas_yuzde x kumas_puan)
Deger = Kalite / Fiyat x 1000
```

Ornek: %59 Pamuk, %37 Polyester, %4 Elastan, fiyat 2490 TL

```
Kalite = 0.59x80 + 0.37x25 + 0.04x40 = 58.1
Deger = 58.1 / 2490 x 1000 = 23.3
```

| Skor | Anlami |
|------|--------|
| 80+ | Mukemmel deger |
| 40-79 | Cok iyi |
| 20-39 | Iyi deger |
| 10-19 | Ortalama |
| <10 | Pahali |

## Teknoloji

- Frontend: React + Vite
- Backend: Python + FastAPI
- AI: Groq API (Llama 4 Scout Vision)
- Hosting: Render.com

## Kurulum

Python 3.10+, Node.js 18+ ve ucretsiz Groq API anahtari gerekli (https://console.groq.com).

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export GROQ_API_KEY="senin-anahtarin"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

localhost:5173 adresinden eris.

## Proje yapisi

```
fabric-check/
  backend/
    main.py
    requirements.txt
  frontend/
    src/
      App.jsx
    package.json
    index.html
```

## Gelecek planlar

- Tarama gecmisi
- Benzer urun karsilastirma
- Marka bazli analiz
- Kategori bazli fiyat karsilastirma
- Kullanici hesap sistemi
- Topluluk puanlari
- React Native mobil uygulama
- Barkod tarama
- Offline mod

## Maliyet

Groq API ve Render hosting ucretsiz. Toplam maliyet 0 TL/ay.
