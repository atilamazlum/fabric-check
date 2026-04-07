import { useState, useRef, useCallback } from "react";

const API = "https://fabric-check-api.onrender.com";

const FABRICS = {
  "Kasmir": 95, "Ipek": 90, "Keten": 85, "Pamuk": 80, "Yun": 78,
  "Bambu": 65, "Tencel": 60, "Viskon": 55, "Modal": 50, "Elastan": 40,
  "Akrilik": 30, "Polyester": 25, "Naylon": 20,
};
const FABRIC_LIST = Object.keys(FABRICS);

function getScoreInfo(score) {
  if (score >= 80) return { gradient: "linear-gradient(135deg, #059669, #10b981)", bg: "#ecfdf5", border: "#6ee7b7", text: "#065f46", label: "Mukemmel deger!", icon: "★★★★★", ring: "#10b981" };
  if (score >= 40) return { gradient: "linear-gradient(135deg, #0d9488, #2dd4bf)", bg: "#f0fdfa", border: "#99f6e4", text: "#115e59", label: "Cok iyi deger", icon: "★★★★☆", ring: "#14b8a6" };
  if (score >= 20) return { gradient: "linear-gradient(135deg, #0284c7, #38bdf8)", bg: "#f0f9ff", border: "#bae6fd", text: "#0c4a6e", label: "Iyi deger", icon: "★★★☆☆", ring: "#0ea5e9" };
  if (score >= 10) return { gradient: "linear-gradient(135deg, #d97706, #fbbf24)", bg: "#fffbeb", border: "#fde68a", text: "#78350f", label: "Ortalama", icon: "★★☆☆☆", ring: "#f59e0b" };
  return { gradient: "linear-gradient(135deg, #dc2626, #f87171)", bg: "#fef2f2", border: "#fecaca", text: "#7f1d1d", label: "Pahali", icon: "★☆☆☆☆", ring: "#ef4444" };
}

function AnimatedScore({ score, info }) {
  const clamped = Math.min(score, 100);
  const pct = clamped / 100;
  const r = 72, circ = 2 * Math.PI * r, arcLen = circ * 0.75, fill = pct * arcLen;

  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <svg width="180" height="150" viewBox="0 0 180 150">
          <defs>
            <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={info.ring} stopOpacity="0.2" />
              <stop offset="100%" stopColor={info.ring} />
            </linearGradient>
          </defs>
          <path d="M 15 125 A 72 72 0 1 1 165 125" fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" />
          <path d="M 15 125 A 72 72 0 1 1 165 125" fill="none" stroke="url(#scoreGrad)" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${fill} ${circ}`}
            style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
          <text x="90" y="82" textAnchor="middle" fill="#1e293b" fontSize="36" fontWeight="800"
            fontFamily="'Space Grotesk', monospace">{score.toFixed(1)}</text>
          <text x="90" y="108" textAnchor="middle" fill={info.ring} fontSize="12" fontWeight="700"
            letterSpacing="1">{info.label.toUpperCase()}</text>
        </svg>
      </div>
      <div style={{ fontSize: "20px", letterSpacing: "4px", marginTop: "-4px", opacity: 0.8 }}>{info.icon}</div>
    </div>
  );
}

function ScanModal({ mode, onResult, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const [status, setStatus] = useState(mode === "camera" ? "starting" : "idle");
  const [preview, setPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const stopCamera = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
      setStatus("ready");
    } catch { setStatus("cam_error"); }
  }, []);

  const processFile = useCallback(async (file) => {
    setStatus("scanning");
    setErrorMsg("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/scan`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const result = await res.json();
      if (result.fabrics?.length > 0) {
        setStatus("success");
        setTimeout(() => { stopCamera(); onResult(result); }, 800);
      } else {
        setStatus("no_match");
        setErrorMsg("Kumas bilgisi bulunamadi");
      }
    } catch (e) {
      setStatus("error");
      setErrorMsg(e.message);
    }
  }, [onResult, stopCamera]);

  const captureCamera = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (blob) processFile(new File([blob], "capture.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }, [processFile]);

  useState(() => { if (mode === "camera") startCamera(); return () => stopCamera(); });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(15,23,42,0.6)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      animation: "fadeIn 0.3s ease",
    }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.4)}50%{box-shadow:0 0 0 12px rgba(16,185,129,0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes scanMove{0%,100%{top:12%}50%{top:82%}}
      `}</style>
      <div style={{
        background: "#fff", borderRadius: "28px", overflow: "hidden",
        width: "100%", maxWidth: "400px", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 32px 64px rgba(0,0,0,0.2)", animation: "slideUp 0.4s ease",
      }}>
        <div style={{
          padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid #f1f5f9",
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "16px", color: "#0f172a" }}>
              {mode === "camera" ? "Canli tarama" : "Fotograf yukle"}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>Yapay zeka ile etiket okuma</div>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} style={{
            width: "34px", height: "34px", borderRadius: "12px", border: "none",
            background: "#f1f5f9", color: "#64748b", fontSize: "18px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>x</button>
        </div>

        {mode === "camera" && (
          <div style={{ position: "relative", background: "#0f172a", aspectRatio: "4/3" }}>
            <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} playsInline muted />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div style={{
              position: "absolute", inset: "12%", border: "2.5px solid rgba(16,185,129,0.5)",
              borderRadius: "16px", pointerEvents: "none",
            }}>
              <div style={{ position: "absolute", top: "-2px", left: "-2px", width: "24px", height: "24px",
                borderTop: "3px solid #10b981", borderLeft: "3px solid #10b981", borderRadius: "8px 0 0 0" }} />
              <div style={{ position: "absolute", top: "-2px", right: "-2px", width: "24px", height: "24px",
                borderTop: "3px solid #10b981", borderRight: "3px solid #10b981", borderRadius: "0 8px 0 0" }} />
              <div style={{ position: "absolute", bottom: "-2px", left: "-2px", width: "24px", height: "24px",
                borderBottom: "3px solid #10b981", borderLeft: "3px solid #10b981", borderRadius: "0 0 0 8px" }} />
              <div style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "24px", height: "24px",
                borderBottom: "3px solid #10b981", borderRight: "3px solid #10b981", borderRadius: "0 0 8px 0" }} />
            </div>
            {status === "scanning" && (
              <>
                <div style={{
                  position: "absolute", left: "12%", right: "12%", height: "2px",
                  background: "linear-gradient(90deg, transparent, #10b981, transparent)",
                  animation: "scanMove 1.5s ease-in-out infinite", borderRadius: "2px",
                  boxShadow: "0 0 12px rgba(16,185,129,0.6)",
                }} />
                <div style={{
                  position: "absolute", inset: 0, background: "rgba(15,23,42,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{
                    background: "rgba(0,0,0,0.7)", borderRadius: "16px", padding: "12px 24px",
                    display: "flex", alignItems: "center", gap: "10px",
                  }}>
                    <div style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.2)",
                      borderTopColor: "#10b981", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    <span style={{ color: "#fff", fontSize: "13px", fontWeight: 700 }}>Analiz ediliyor...</span>
                  </div>
                </div>
              </>
            )}
            {status === "success" && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(16,185,129,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: "60px", height: "60px", borderRadius: "50%", background: "#10b981",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "pulse 1s ease", boxShadow: "0 8px 32px rgba(16,185,129,0.4)",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "photo" && !preview && status === "idle" && (
          <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if(f){setPreview(URL.createObjectURL(f)); processFile(f);} }} />
            <button onClick={() => fileRef.current?.click()} style={{
              width: "100%", padding: "22px", borderRadius: "16px",
              border: "2px dashed #d1fae5", background: "linear-gradient(135deg, rgba(16,185,129,0.04), rgba(5,150,105,0.08))",
              color: "#059669", fontSize: "15px", fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
              transition: "all 0.2s",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
              Fotograf cek
            </button>
            <button onClick={() => {
              const i = document.createElement("input"); i.type = "file"; i.accept = "image/*";
              i.onchange = (e) => { const f = e.target.files?.[0]; if(f){setPreview(URL.createObjectURL(f)); processFile(f);} }; i.click();
            }} style={{
              width: "100%", padding: "22px", borderRadius: "16px",
              border: "2px dashed #e2e8f0", background: "rgba(241,245,249,0.5)",
              color: "#64748b", fontSize: "15px", fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              Galeriden sec
            </button>
          </div>
        )}

        {mode === "photo" && preview && (
          <div style={{ position: "relative" }}>
            <img src={preview} alt="" style={{ width: "100%", maxHeight: "280px", objectFit: "contain", display: "block", background: "#f8fafc" }} />
            {status === "scanning" && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ width: "44px", height: "44px", border: "3px solid #e2e8f0", borderTopColor: "#10b981",
                  borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                <div style={{ marginTop: "14px", color: "#059669", fontWeight: 800, fontSize: "14px" }}>Yapay zeka okuyor...</div>
                <div style={{ marginTop: "4px", color: "#94a3b8", fontSize: "12px" }}>Kumas ve fiyat bilgisi araniyor</div>
              </div>
            )}
            {status === "success" && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(236,253,245,0.9)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: "56px", height: "56px", borderRadius: "50%", background: "#10b981",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 8px 32px rgba(16,185,129,0.3)",
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div style={{ marginTop: "10px", color: "#065f46", fontWeight: 800 }}>Bulundu!</div>
              </div>
            )}
          </div>
        )}

        <div style={{ padding: "16px 20px" }}>
          {mode === "camera" && status === "ready" && (
            <button onClick={captureCamera} style={{
              width: "100%", padding: "15px", borderRadius: "14px", border: "none",
              background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff",
              fontSize: "15px", fontWeight: 800, cursor: "pointer",
              boxShadow: "0 4px 20px rgba(16,185,129,0.3)",
            }}>Etiketi tara</button>
          )}
          {(status === "no_match" || status === "error") && (
            <div>
              <div style={{
                background: status === "error" ? "#fef2f2" : "#fffbeb",
                border: `1px solid ${status === "error" ? "#fecaca" : "#fde68a"}`,
                borderRadius: "14px", padding: "14px 16px", marginBottom: "12px",
              }}>
                <div style={{ fontWeight: 800, fontSize: "13px", color: status === "error" ? "#991b1b" : "#92400e", marginBottom: "4px" }}>
                  {status === "error" ? "Baglanti hatasi" : "Kumas bilgisi bulunamadi"}
                </div>
                {errorMsg && <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace", wordBreak: "break-all" }}>{errorMsg.slice(0, 200)}</div>}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => { setStatus(mode === "camera" ? "ready" : "idle"); setPreview(null); setErrorMsg(""); }}
                  style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0",
                    background: "#fff", color: "#475569", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>Tekrar dene</button>
                <button onClick={() => { stopCamera(); onClose(); }}
                  style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none",
                    background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>Elle gir</button>
              </div>
            </div>
          )}
          {mode === "camera" && status === "starting" && (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "8px" }}>Kamera aciliyor...</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FabricScorer() {
  const [rows, setRows] = useState([{ fabric: "", pct: "" }]);
  const [price, setPrice] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [scanMode, setScanMode] = useState(null);
  const [scanInfo, setScanInfo] = useState(null);

  const totalPct = rows.reduce((s, r) => s + (Number(r.pct) || 0), 0);
  const qualityScore = rows.reduce((s, r) => s + ((Number(r.pct) || 0) / 100) * (FABRICS[r.fabric] || 0), 0);
  const priceNum = Number(price) || 0;
  const valueScore = priceNum > 0 ? (qualityScore / priceNum) * 1000 : 0;
  const scoreInfo = getScoreInfo(valueScore);
  const canCalculate = totalPct === 100 && priceNum > 0 && rows.every(r => r.fabric);

  const updateRow = (i, field, val) => { const n = [...rows]; n[i] = { ...n[i], [field]: val }; setRows(n); setShowResult(false); };
  const addRow = () => { setRows([...rows, { fabric: "", pct: "" }]); setShowResult(false); };
  const removeRow = (i) => { if (rows.length <= 1) return; setRows(rows.filter((_, j) => j !== i)); setShowResult(false); };

  const handleResult = (result) => {
    const newRows = result.fabrics.map(f => ({ fabric: f.name, pct: String(f.pct) }));
    if (newRows.length > 0) setRows(newRows);
    if (result.price) setPrice(String(Math.round(result.price)));
    setScanInfo({ raw_text: result.raw_text, product: result.product });
    setScanMode(null);
    setShowResult(false);
  };

  const inp = {
    padding: "13px 14px", borderRadius: "12px", border: "1.5px solid #e2e8f0",
    background: "#f8fafc", color: "#0f172a", fontSize: "15px",
    fontFamily: "'Nunito', sans-serif", outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh", fontFamily: "'Nunito', sans-serif", color: "#0f172a",
      background: "#f8fafc",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes countUp{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}
        input:focus,select:focus{border-color:#10b981!important;box-shadow:0 0 0 3px rgba(16,185,129,0.1)!important}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
      `}</style>
      {scanMode && <ScanModal mode={scanMode} onResult={handleResult} onClose={() => setScanMode(null)} />}

      {/* Header */}
      <div style={{
        padding: "0 20px", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        borderRadius: "0 0 32px 32px", marginBottom: "24px",
      }}>
        <div style={{ padding: "52px 0 36px", textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(16,185,129,0.15)", borderRadius: "40px", padding: "6px 16px",
            marginBottom: "16px", border: "1px solid rgba(16,185,129,0.2)",
          }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981",
              boxShadow: "0 0 8px rgba(16,185,129,0.6)" }} />
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#10b981", letterSpacing: "2px", textTransform: "uppercase" }}>
              Fabric Check
            </span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 6px", color: "#fff", lineHeight: 1.2 }}>
            Bu fiyata deger mi?
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px", margin: 0, fontWeight: 600 }}>
            Yapay zeka ile etiket oku, aninda puanla
          </p>
        </div>
      </div>

      <div style={{ padding: "0 16px 40px", maxWidth: "440px", margin: "0 auto" }}>
        {/* Scan buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
          <button onClick={() => setScanMode("camera")} style={{
            padding: "20px 10px", borderRadius: "18px", border: "none",
            background: "#fff", color: "#0f172a", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            fontSize: "13px", fontWeight: 800, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "14px",
              background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            Canli tarama
          </button>
          <button onClick={() => setScanMode("photo")} style={{
            padding: "20px 10px", borderRadius: "18px", border: "none",
            background: "#fff", color: "#0f172a", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            fontSize: "13px", fontWeight: 800, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
          }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "14px",
              background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            Fotograf yukle
          </button>
        </div>

        {/* Scan info */}
        {scanInfo && (
          <div style={{
            padding: "14px 16px", marginBottom: "16px",
            background: "#fff", borderRadius: "16px",
            border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            animation: "fadeUp 0.4s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981",
                boxShadow: "0 0 6px rgba(16,185,129,0.4)" }} />
              <span style={{ fontWeight: 800, fontSize: "11px", color: "#10b981", letterSpacing: "1px" }}>
                YAPAY ZEKA ILE OKUNDU
              </span>
            </div>
            {scanInfo.product && <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>{scanInfo.product}</div>}
            {scanInfo.raw_text && <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace", marginTop: "4px" }}>{scanInfo.raw_text.slice(0, 120)}</div>}
          </div>
        )}

        {/* Fabric Card */}
        <div style={{
          background: "#fff", borderRadius: "20px", padding: "20px",
          marginBottom: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase" }}>Kumas icerigi</span>
            <span style={{
              fontSize: "12px", fontWeight: 800, fontFamily: "'Space Grotesk'",
              color: totalPct === 100 ? "#059669" : totalPct > 100 ? "#dc2626" : "#cbd5e1",
              background: totalPct === 100 ? "#ecfdf5" : totalPct > 100 ? "#fef2f2" : "#f8fafc",
              padding: "2px 10px", borderRadius: "20px",
            }}>%{totalPct}</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
              <select value={r.fabric} onChange={e => updateRow(i, "fabric", e.target.value)}
                style={{ ...inp, flex: 1, appearance: "none", cursor: "pointer" }}>
                <option value="">Kumas sec</option>
                {FABRIC_LIST.map(f => <option key={f} value={f}>{f} ({FABRICS[f]}p)</option>)}
              </select>
              <div style={{ position: "relative", width: "76px" }}>
                <input type="number" min="0" max="100" value={r.pct}
                  onChange={e => updateRow(i, "pct", e.target.value)}
                  style={{ ...inp, width: "100%", paddingRight: "26px", boxSizing: "border-box", textAlign: "center", fontWeight: 800 }} />
                <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#cbd5e1", fontSize: "13px", pointerEvents: "none" }}>%</span>
              </div>
              <button onClick={() => removeRow(i)} style={{
                width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
                border: "1.5px solid #e2e8f0", background: "#f8fafc",
                color: "#cbd5e1", fontSize: "16px", cursor: "pointer",
              }}>x</button>
            </div>
          ))}
          <button onClick={addRow} style={{
            width: "100%", padding: "10px", borderRadius: "10px",
            border: "1.5px dashed #e2e8f0", background: "transparent",
            color: "#cbd5e1", fontSize: "13px", fontWeight: 800, cursor: "pointer",
          }}>+ ekle</button>
        </div>

        {/* Price Card */}
        <div style={{
          background: "#fff", borderRadius: "20px", padding: "20px",
          marginBottom: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 800, letterSpacing: "1.5px",
            textTransform: "uppercase", display: "block", marginBottom: "10px" }}>Fiyat</span>
          <div style={{ position: "relative" }}>
            <input type="number" value={price} onChange={e => { setPrice(e.target.value); setShowResult(false); }}
              placeholder="Etiket fiyati"
              style={{ ...inp, width: "100%", paddingRight: "36px", boxSizing: "border-box",
                fontSize: "22px", fontWeight: 800, fontFamily: "'Space Grotesk'" }} />
            <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
              color: "#cbd5e1", fontSize: "18px", fontWeight: 800 }}>TL</span>
          </div>
        </div>

        {/* Calculate */}
        <button onClick={() => setShowResult(true)} disabled={!canCalculate} style={{
          width: "100%", padding: "17px", borderRadius: "16px", border: "none",
          background: canCalculate ? "linear-gradient(135deg, #10b981, #059669)" : "#e2e8f0",
          color: canCalculate ? "#fff" : "#94a3b8", fontSize: "16px", fontWeight: 800,
          cursor: canCalculate ? "pointer" : "default",
          boxShadow: canCalculate ? "0 8px 24px rgba(16,185,129,0.3)" : "none",
          transition: "all 0.3s",
        }}>
          {totalPct !== 100 && totalPct > 0 ? `Toplam %${totalPct} — %100 olmali` : "Puanla"}
        </button>

        {/* Result */}
        {showResult && canCalculate && (
          <div style={{
            marginTop: "20px", background: "#fff", borderRadius: "24px",
            overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            animation: "fadeUp 0.5s ease",
          }}>
            {/* Score header */}
            <div style={{
              background: scoreInfo.gradient, padding: "8px 20px 4px",
              textAlign: "center",
            }}>
              <AnimatedScore score={valueScore} info={scoreInfo} />
            </div>

            {/* Details */}
            <div style={{ padding: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                <div style={{
                  background: "#f8fafc", borderRadius: "14px", padding: "14px", textAlign: "center",
                }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Kalite</div>
                  <div style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a", fontFamily: "'Space Grotesk'", animation: "countUp 0.6s ease" }}>
                    {qualityScore.toFixed(0)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#cbd5e1", fontWeight: 700 }}>/100</div>
                </div>
                <div style={{
                  background: "#f8fafc", borderRadius: "14px", padding: "14px", textAlign: "center",
                }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Fiyat</div>
                  <div style={{ fontSize: "28px", fontWeight: 900, color: "#0f172a", fontFamily: "'Space Grotesk'", animation: "countUp 0.6s ease 0.1s both" }}>
                    {priceNum}
                  </div>
                  <div style={{ fontSize: "11px", color: "#cbd5e1", fontWeight: 700 }}>TL</div>
                </div>
              </div>

              {/* Formula */}
              <div style={{
                padding: "12px 14px", background: "#f8fafc", borderRadius: "12px",
                fontSize: "12px", color: "#94a3b8", fontFamily: "'Space Grotesk', monospace",
                lineHeight: 1.8,
              }}>
                {rows.filter(r => r.fabric).map((r, i) => (
                  <span key={i}>
                    {i > 0 && <span style={{ color: "#cbd5e1" }}> + </span>}
                    <span style={{ color: "#64748b" }}>{r.pct}%</span>
                    <span style={{ color: "#cbd5e1" }}>x</span>
                    <span style={{ color: "#64748b" }}>{FABRICS[r.fabric]}</span>
                  </span>
                ))}
                <span style={{ color: "#cbd5e1" }}> = </span>
                <span style={{ color: "#0f172a", fontWeight: 700 }}>{qualityScore.toFixed(1)}</span>
                <span style={{ color: "#cbd5e1" }}> / </span>
                <span style={{ color: "#0f172a", fontWeight: 700 }}>{priceNum}</span>
                <span style={{ color: "#cbd5e1" }}> = </span>
                <span style={{ color: scoreInfo.text, fontWeight: 800 }}>{valueScore.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
