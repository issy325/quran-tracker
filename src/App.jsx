import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { SURAH_DATA, SURAHS, AYAH_COUNTS } from "./quranData.js";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════
const RATING_LEVELS = ["Weak", "Okay", "Good", "Strong", "Memorized"];
const RATING_COLORS_LIGHT = { Weak: "#ef4444", Okay: "#f97316", Good: "#eab308", Strong: "#22c55e", Memorized: "#0d9488" };
const RATING_COLORS_DARK = { Weak: "#dc2626", Okay: "#ea580c", Good: "#ca8a04", Strong: "#16a34a", Memorized: "#0f766e" };

const generateItems = (type, count) => Array.from({ length: count }, (_, i) => {
  if (type === "surah") return { id: i, name: `${i + 1}. ${SURAHS[i]}` };
  if (type === "para") return { id: i, name: `Juz ${i + 1}` };
  if (type === "quarter") { return { id: i, name: `Juz ${Math.floor(i / 4) + 1}, Q${(i % 4) + 1}` }; }
  return { id: i, name: `Ruku ${i + 1}` };
});

const TABS = [
  { key: "para", label: "Para", icon: "📖", count: 30 },
  { key: "surah", label: "Surah", icon: "📜", count: 114 },
  { key: "quarter", label: "Hizb Q", icon: "◐", count: 120 },
  { key: "ruku", label: "Ruku", icon: "📑", count: 558 },
];

const NAV_ITEMS = [
  { key: "home", icon: "🏠", label: "Home" },
  { key: "tracker", icon: "📖", label: "Tracker" },
  { key: "sabak", icon: "🧠", label: "Sabak" },
  { key: "stats", icon: "📊", label: "Stats" },
  { key: "settings", icon: "⚙️", label: "Settings" },
];

const getToday = () => new Date().toISOString().split("T")[0];

// ═══════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════
const LOCAL_KEY = "quran-tracker-data";
const SCRIPT_URL_KEY = "quran-tracker-script-url";

const defaultData = () => ({
  readings: {},
  dailyGoal: 5,
  streak: { current: 0, best: 0, lastDate: null },
  sabak: [],      // [{ date, surahIndex, fromAyah, toAyah, surahName }]
  sabakDhor: [],  // [{ date, type:"precise"|"juz", surahIndex?, fromAyah?, toAyah?, surahName?, juzIndex?, juzName? }]
  dhor: [],       // [{ date, quarterIndex, quarterName }]
});

function loadLocal() {
  try { const r = localStorage.getItem(LOCAL_KEY); return r ? { ...defaultData(), ...JSON.parse(r) } : defaultData(); }
  catch { return defaultData(); }
}
function saveLocal(data) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch {} }
function getScriptUrl() { try { return localStorage.getItem(SCRIPT_URL_KEY) || ""; } catch { return ""; } }

async function syncToCloud(data, url) {
  if (!url) return { success: false };
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(data) });
    return await res.json();
  } catch { return { success: false }; }
}

async function loadFromCloud(url) {
  if (!url) return null;
  try { const res = await fetch(url); const json = await res.json(); return json.success ? json.data : null; }
  catch { return null; }
}

// ═══════════════════════════════════════════════════════════
// THEMES
// ═══════════════════════════════════════════════════════════
const themes = {
  light: {
    bg: "#f0fdf4", bgCard: "#ffffff", bgCardAlt: "#f7fef9",
    text: "#1a2e1a", textSecondary: "#4a6a4a", textMuted: "#7a9a7a",
    accent: "#166534", accentLight: "#22c55e", accentBg: "#dcfce7",
    border: "#bbf7d0", borderLight: "#d1fae5",
    shadow: "0 1px 3px rgba(0,50,0,0.08)", shadowLg: "0 4px 20px rgba(0,50,0,0.1)",
    gradient: "linear-gradient(135deg, #166534 0%, #15803d 50%, #22c55e 100%)",
    inputBg: "#f0fdf4", inputBorder: "#86efac",
    ratingColors: RATING_COLORS_LIGHT,
    heatEmpty: "#e2e8f0", heatL1: "#bbf7d0", heatL2: "#86efac", heatL3: "#22c55e", heatL4: "#166534",
    sabakBg: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
    dhorBg: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
    dhorSectionBg: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
  },
  dark: {
    bg: "#0a1f0a", bgCard: "#112211", bgCardAlt: "#152a15",
    text: "#d1fae5", textSecondary: "#86efac", textMuted: "#4ade80",
    accent: "#22c55e", accentLight: "#4ade80", accentBg: "#052e16",
    border: "#14532d", borderLight: "#166534",
    shadow: "0 1px 3px rgba(0,0,0,0.3)", shadowLg: "0 4px 20px rgba(0,0,0,0.4)",
    gradient: "linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)",
    inputBg: "#0d2d0d", inputBorder: "#14532d",
    ratingColors: RATING_COLORS_DARK,
    heatEmpty: "#1a2e1a", heatL1: "#052e16", heatL2: "#14532d", heatL3: "#166534", heatL4: "#22c55e",
    sabakBg: "linear-gradient(135deg, #064e3b 0%, #0f766e 100%)",
    dhorBg: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)",
    dhorSectionBg: "linear-gradient(135deg, #92400e 0%, #d97706 100%)",
  }
};

// ═══════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════════════
function CalendarHeatmap({ data, theme: t }) {
  const heatmapData = useMemo(() => {
    const end = new Date();
    const start = new Date(); start.setMonth(start.getMonth() - 5); start.setDate(start.getDate() - start.getDay());
    const countByDate = {};
    Object.values(data.readings).forEach(r => r.logs.forEach(l => { countByDate[l] = (countByDate[l] || 0) + 1; }));
    (data.sabak || []).forEach(s => { countByDate[s.date] = (countByDate[s.date] || 0) + 1; });
    (data.sabakDhor || []).forEach(s => { countByDate[s.date] = (countByDate[s.date] || 0) + 1; });
    (data.dhor || []).forEach(s => { countByDate[s.date] = (countByDate[s.date] || 0) + 1; });
    const days = [];
    const cur = new Date(start);
    while (cur <= end) { const ds = cur.toISOString().split("T")[0]; days.push({ date: ds, count: countByDate[ds] || 0, day: cur.getDay() }); cur.setDate(cur.getDate() + 1); }
    return days;
  }, [data]);

  const weeks = useMemo(() => {
    const w = []; let cw = [];
    heatmapData.forEach((d, i) => { cw.push(d); if (d.day === 6 || i === heatmapData.length - 1) { w.push(cw); cw = []; } });
    return w;
  }, [heatmapData]);

  const months = useMemo(() => {
    const m = []; let last = -1;
    weeks.forEach((wk, wi) => { const mo = new Date(wk[0].date).getMonth(); if (mo !== last) { m.push({ label: new Date(wk[0].date).toLocaleDateString("en", { month: "short" }), wi }); last = mo; } });
    return m;
  }, [weeks]);

  const getColor = (c) => c === 0 ? t.heatEmpty : c <= 2 ? t.heatL1 : c <= 5 ? t.heatL2 : c <= 10 ? t.heatL3 : t.heatL4;
  const sz = 11, gap = 2;

  return (
    <div style={{ background: t.bgCard, borderRadius: 16, padding: 20, boxShadow: t.shadow, border: `1px solid ${t.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>📅 Activity</div>
      </div>
      <div style={{ overflow: "auto", paddingBottom: 4 }}>
        <div style={{ position: "relative", minWidth: weeks.length * (sz + gap) }}>
          <div style={{ display: "flex", marginBottom: 4, height: 14 }}>
            {months.map((m, i) => <div key={i} style={{ position: "absolute", left: m.wi * (sz + gap), fontSize: 9, color: t.textMuted }}>{m.label}</div>)}
          </div>
          <div style={{ display: "flex", gap }}>
            {weeks.map((wk, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap }}>
                {[0,1,2,3,4,5,6].map(dow => {
                  const d = wk.find(x => x.day === dow);
                  if (!d) return <div key={dow} style={{ width: sz, height: sz }} />;
                  return <div key={dow} title={`${d.date}: ${d.count}`} style={{ width: sz, height: sz, borderRadius: 2, background: getColor(d.count) }} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 9, color: t.textMuted }}>Less</span>
        {[t.heatEmpty, t.heatL1, t.heatL2, t.heatL3, t.heatL4].map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />)}
        <span style={{ fontSize: 9, color: t.textMuted }}>More</span>
      </div>
    </div>
  );
}

function UndoToast({ message, onUndo, onDismiss, theme: t }) {
  useEffect(() => { const tm = setTimeout(onDismiss, 5000); return () => clearTimeout(tm); }, [onDismiss]);
  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      background: t.text, color: t.bg, padding: "12px 20px", borderRadius: 12,
      display: "flex", alignItems: "center", gap: 16, zIndex: 200,
      boxShadow: "0 8px 30px rgba(0,0,0,0.3)", fontSize: 13, fontWeight: 500,
      animation: "slideUp 0.3s ease"
    }}>
      <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{message}</span>
      <button onClick={onUndo} style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>UNDO</button>
    </div>
  );
}

// Select dropdown component
function Select({ value, onChange, options, placeholder, style: sx, theme: t }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.inputBorder}`,
      background: t.inputBg, color: t.text, fontSize: 14, outline: "none",
      appearance: "none", WebkitAppearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
      backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: 30, ...sx
    }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("qt-dark") === "true"; } catch { return false; } });
  const [data, setData] = useState(() => loadLocal());
  const [activeTab, setActiveTab] = useState("para");
  const [view, setView] = useState("home");
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [scriptUrl] = useState(() => getScriptUrl());
  const [syncStatus, setSyncStatus] = useState("idle");
  const [showUndo, setShowUndo] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [sabakTab, setSabakTab] = useState("sabak"); // sabak | dhor
  const syncTimer = useRef(null);
  const t = dark ? themes.dark : themes.light;

  useEffect(() => { saveLocal(data); }, [data]);
  useEffect(() => { try { localStorage.setItem("qt-dark", dark.toString()); } catch {} }, [dark]);

  // Cloud sync
  useEffect(() => {
    const url = getScriptUrl(); if (!url) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      setSyncStatus("syncing");
      const r = await syncToCloud(data, url);
      setSyncStatus(r.success ? "synced" : "error");
      if (r.success) setTimeout(() => setSyncStatus("idle"), 3000);
    }, 2000);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [data]);

  useEffect(() => {
    const url = getScriptUrl(); if (!url) return;
    (async () => {
      const cloud = await loadFromCloud(url);
      if (cloud && Object.keys(cloud.readings || {}).length >= Object.keys(data.readings || {}).length) {
        setData(prev => ({ ...defaultData(), ...cloud }));
      }
    })();
  }, []);

  // Streak check
  useEffect(() => {
    const td = getToday(), y = new Date(); y.setDate(y.getDate() - 1);
    const yd = y.toISOString().split("T")[0];
    if (data.streak.lastDate && data.streak.lastDate !== td && data.streak.lastDate !== yd)
      setData(p => ({ ...p, streak: { ...p.streak, current: 0 } }));
  }, []);

  const updateData = useCallback((fn, undoMsg) => {
    setData(prev => {
      if (undoMsg) {
        setUndoStack(s => [...s.slice(-9), { snapshot: JSON.parse(JSON.stringify(prev)), message: undoMsg }]);
        setShowUndo(undoMsg);
      }
      const next = JSON.parse(JSON.stringify(prev));
      fn(next);
      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack(s => {
      if (!s.length) return s;
      setData(s[s.length - 1].snapshot);
      setShowUndo(null);
      return s.slice(0, -1);
    });
  }, []);

  const getReading = useCallback((type, id) => data.readings[`${type}-${id}`] || { rating: null, logs: [], lastRead: null }, [data]);

  const markRead = useCallback((type, id, name) => {
    updateData(d => {
      const key = `${type}-${id}`;
      if (!d.readings[key]) d.readings[key] = { rating: null, logs: [], lastRead: null };
      const td = getToday();
      d.readings[key].logs.push(td);
      d.readings[key].lastRead = td;
      const y = new Date(); y.setDate(y.getDate() - 1); const yd = y.toISOString().split("T")[0];
      if (d.streak.lastDate === td) {}
      else if (d.streak.lastDate === yd || !d.streak.lastDate) { d.streak.current++; d.streak.best = Math.max(d.streak.best, d.streak.current); d.streak.lastDate = td; }
      else { d.streak.current = 1; d.streak.lastDate = td; }
    }, `Marked "${name}" as read`);
  }, [updateData]);

  const setRating = useCallback((type, id, rating, name) => {
    updateData(d => {
      const key = `${type}-${id}`;
      if (!d.readings[key]) d.readings[key] = { rating: null, logs: [], lastRead: null };
      d.readings[key].rating = rating;
    }, `Rated "${name}" as ${rating}`);
  }, [updateData]);

  const todayReadCount = useMemo(() => {
    const td = getToday(); let c = 0;
    Object.values(data.readings).forEach(r => { c += r.logs.filter(l => l === td).length; });
    c += (data.sabak || []).filter(s => s.date === td).length;
    c += (data.sabakDhor || []).filter(s => s.date === td).length;
    c += (data.dhor || []).filter(s => s.date === td).length;
    return c;
  }, [data]);

  const weeklyData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      let count = 0;
      Object.values(data.readings).forEach(r => { count += r.logs.filter(l => l === ds).length; });
      count += (data.sabak || []).filter(s => s.date === ds).length;
      count += (data.sabakDhor || []).filter(s => s.date === ds).length;
      count += (data.dhor || []).filter(s => s.date === ds).length;
      days.push({ day: d.toLocaleDateString("en", { weekday: "short" }), count, date: ds });
    }
    return days;
  }, [data]);

  // ── SABAK & SABAK DHOR VIEW ──
  const SabakView = () => {
    const isSabak = sabakTab === "sabak";
    const isSabakDhor = sabakTab === "sabakDhor";
    const isDhor = sabakTab === "dhor";
    const entries = isSabak ? (data.sabak || []) : isSabakDhor ? (data.sabakDhor || []) : (data.dhor || []);

    // Get last sabak entry to auto-fill "from"
    const lastSabak = useMemo(() => {
      const sorted = [...(data.sabak || [])].sort((a, b) => b.date.localeCompare(a.date));
      return sorted[0] || null;
    }, [data.sabak]);

    // Sabak form state
    const [surahIdx, setSurahIdx] = useState("");
    const [fromAyah, setFromAyah] = useState("");
    const [toAyah, setToAyah] = useState("");

    // Sabak Dhor form state
    const [dhorMode, setDhorMode] = useState("precise"); // precise | juz
    const [dhorSurahIdx, setDhorSurahIdx] = useState("");
    const [dhorFromAyah, setDhorFromAyah] = useState("");
    const [dhorToAyah, setDhorToAyah] = useState("");
    const [dhorJuzIdx, setDhorJuzIdx] = useState("");

    // Dhor (by quarter) form state
    const [dhorQuarterIdx, setDhorQuarterIdx] = useState("");

    // Auto-fill sabak from last entry
    useEffect(() => {
      if (isSabak && lastSabak) {
        const lastTo = lastSabak.toAyah;
        const lastSurahAyahCount = AYAH_COUNTS[lastSabak.surahIndex];
        if (lastTo >= lastSurahAyahCount) {
          // Finished surah, move to next
          const nextSurah = lastSabak.surahIndex + 1;
          if (nextSurah < 114) { setSurahIdx(String(nextSurah)); setFromAyah("1"); }
        } else {
          setSurahIdx(String(lastSabak.surahIndex));
          setFromAyah(String(lastTo + 1));
        }
      }
    }, [isSabak, lastSabak]);

    const maxAyah = surahIdx !== "" ? AYAH_COUNTS[parseInt(surahIdx)] : 0;
    const dhorMaxAyah = dhorSurahIdx !== "" ? AYAH_COUNTS[parseInt(dhorSurahIdx)] : 0;

    const handleSabakSubmit = () => {
      if (surahIdx === "" || !fromAyah || !toAyah) return;
      const si = parseInt(surahIdx), fa = parseInt(fromAyah), ta = parseInt(toAyah);
      if (fa > ta || ta > AYAH_COUNTS[si]) return;
      updateData(d => {
        if (!d.sabak) d.sabak = [];
        d.sabak.push({ date: getToday(), surahIndex: si, fromAyah: fa, toAyah: ta, surahName: `${si + 1}. ${SURAHS[si]}` });
        // Update streak
        const td = getToday(), y = new Date(); y.setDate(y.getDate() - 1); const yd = y.toISOString().split("T")[0];
        if (d.streak.lastDate === td) {}
        else if (d.streak.lastDate === yd || !d.streak.lastDate) { d.streak.current++; d.streak.best = Math.max(d.streak.best, d.streak.current); d.streak.lastDate = td; }
        else { d.streak.current = 1; d.streak.lastDate = td; }
      }, `Sabak: ${SURAHS[parseInt(surahIdx)]} ${fromAyah}-${toAyah}`);
      setToAyah("");
    };

    const handleSabakDhorSubmit = () => {
      if (dhorMode === "precise") {
        if (dhorSurahIdx === "" || !dhorFromAyah || !dhorToAyah) return;
        const si = parseInt(dhorSurahIdx), fa = parseInt(dhorFromAyah), ta = parseInt(dhorToAyah);
        if (fa > ta || ta > AYAH_COUNTS[si]) return;
        updateData(d => {
          if (!d.sabakDhor) d.sabakDhor = [];
          d.sabakDhor.push({ date: getToday(), type: "precise", surahIndex: si, fromAyah: fa, toAyah: ta, surahName: `${si + 1}. ${SURAHS[si]}` });
        }, `Sabak Dhor: ${SURAHS[parseInt(dhorSurahIdx)]} ${dhorFromAyah}-${dhorToAyah}`);
      } else {
        if (dhorJuzIdx === "") return;
        const ji = parseInt(dhorJuzIdx);
        updateData(d => {
          if (!d.sabakDhor) d.sabakDhor = [];
          d.sabakDhor.push({ date: getToday(), type: "juz", juzIndex: ji, juzName: `Juz ${ji + 1}` });
        }, `Sabak Dhor: Juz ${parseInt(dhorJuzIdx) + 1}`);
      }
      setDhorFromAyah(""); setDhorToAyah("");
    };

    const handleDhorSubmit = () => {
      if (dhorQuarterIdx === "") return;
      const qi = parseInt(dhorQuarterIdx);
      const qName = `Juz ${Math.floor(qi / 4) + 1}, Q${(qi % 4) + 1}`;
      updateData(d => {
        if (!d.dhor) d.dhor = [];
        d.dhor.push({ date: getToday(), quarterIndex: qi, quarterName: qName });
      }, `Dhor: ${qName}`);
      setDhorQuarterIdx("");
    };

    // Calculate total ayahs memorized (sabak)
    const totalAyahsMemo = useMemo(() => {
      return (data.sabak || []).reduce((a, s) => a + (s.toAyah - s.fromAyah + 1), 0);
    }, [data.sabak]);

    // Entries grouped by date (most recent first)
    const groupedEntries = useMemo(() => {
      const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
      const groups = {};
      sorted.forEach(e => { if (!groups[e.date]) groups[e.date] = []; groups[e.date].push(e); });
      return Object.entries(groups);
    }, [entries]);

    const surahOptions = SURAHS.map((s, i) => ({ value: String(i), label: `${i + 1}. ${s}` }));
    const juzOptions = Array.from({ length: 30 }, (_, i) => ({ value: String(i), label: `Juz ${i + 1}` }));
    const quarterOptions = Array.from({ length: 120 }, (_, i) => ({
      value: String(i),
      label: `Juz ${Math.floor(i / 4) + 1}, Q${(i % 4) + 1}`
    }));

    const accentColor = isSabak ? "#0d9488" : isSabakDhor ? "#7c3aed" : "#d97706";

    return (
      <div style={{ padding: "16px 16px 100px" }}>
        {/* Tab toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {[
            { key: "sabak", label: "🧠 Sabak", sub: "New Lesson", bg: t.sabakBg },
            { key: "sabakDhor", label: "🔄 Sabak Dhor", sub: "Revision", bg: t.dhorBg },
            { key: "dhor", label: "📚 Dhor", sub: "By Quarter", bg: t.dhorSectionBg },
          ].map(tab => (
            <button key={tab.key} onClick={() => setSabakTab(tab.key)} style={{
              flex: 1, padding: "12px 4px", borderRadius: 14, border: "none", cursor: "pointer",
              background: sabakTab === tab.key ? tab.bg : t.bgCard,
              color: sabakTab === tab.key ? "#fff" : t.textMuted,
              boxShadow: sabakTab === tab.key ? t.shadowLg : t.shadow,
              borderWidth: 1, borderStyle: "solid", borderColor: sabakTab === tab.key ? "transparent" : t.border,
              transition: "all 0.2s"
            }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{tab.label}</div>
              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{tab.sub}</div>
            </button>
          ))}
        </div>

        {/* ── SABAK FORM ── */}
        {isSabak && (
          <div style={{ background: t.bgCard, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: t.shadow, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 4 }}>Log Today's Sabak</div>
            {lastSabak && (
              <div style={{ fontSize: 11, color: t.accent, marginBottom: 12, padding: "6px 10px", background: t.accentBg, borderRadius: 8, display: "inline-block" }}>
                Last: {lastSabak.surahName}, Ayah {lastSabak.fromAyah}–{lastSabak.toAyah} ({lastSabak.date})
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Select theme={t} value={surahIdx} onChange={v => { setSurahIdx(v); if (!lastSabak || parseInt(v) !== lastSabak.surahIndex) setFromAyah("1"); setToAyah(""); }}
                options={surahOptions} placeholder="Select Surah" style={{ width: "100%" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>From Ayah</div>
                  <input type="number" min="1" max={maxAyah} value={fromAyah} onChange={e => setFromAyah(e.target.value)}
                    placeholder="From" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>To Ayah {maxAyah ? `(max ${maxAyah})` : ""}</div>
                  <input type="number" min={fromAyah || "1"} max={maxAyah} value={toAyah} onChange={e => setToAyah(e.target.value)}
                    placeholder="To" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              {fromAyah && toAyah && parseInt(toAyah) >= parseInt(fromAyah) && (
                <div style={{ fontSize: 12, color: t.accent, fontWeight: 600 }}>
                  📝 {parseInt(toAyah) - parseInt(fromAyah) + 1} ayahs in this session
                </div>
              )}
              <button onClick={handleSabakSubmit} disabled={!surahIdx || !fromAyah || !toAyah}
                style={{
                  padding: 14, background: surahIdx && fromAyah && toAyah ? t.sabakBg : t.border,
                  color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
                  cursor: surahIdx && fromAyah && toAyah ? "pointer" : "not-allowed", letterSpacing: 0.5,
                  opacity: surahIdx && fromAyah && toAyah ? 1 : 0.5
                }}>
                ✓ Log Sabak
              </button>
            </div>
          </div>
        )}

        {/* ── SABAK DHOR FORM ── */}
        {isSabakDhor && (
          <div style={{ background: t.bgCard, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: t.shadow, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 12 }}>Log Today's Sabak Dhor</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[
                { key: "precise", label: "Surah + Ayah" },
                { key: "juz", label: "Whole Juz" },
              ].map(m => (
                <button key={m.key} onClick={() => setDhorMode(m.key)} style={{
                  flex: 1, padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: dhorMode === m.key ? t.accent : t.bgCardAlt,
                  color: dhorMode === m.key ? "#fff" : t.textMuted,
                  border: dhorMode === m.key ? "none" : `1px solid ${t.border}`,
                }}>{m.label}</button>
              ))}
            </div>
            {dhorMode === "precise" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Select theme={t} value={dhorSurahIdx} onChange={v => { setDhorSurahIdx(v); setDhorFromAyah("1"); setDhorToAyah(""); }}
                  options={surahOptions} placeholder="Select Surah" style={{ width: "100%" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>From Ayah</div>
                    <input type="number" min="1" max={dhorMaxAyah} value={dhorFromAyah} onChange={e => setDhorFromAyah(e.target.value)}
                      placeholder="From" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>To Ayah {dhorMaxAyah ? `(max ${dhorMaxAyah})` : ""}</div>
                    <input type="number" min={dhorFromAyah || "1"} max={dhorMaxAyah} value={dhorToAyah} onChange={e => setDhorToAyah(e.target.value)}
                      placeholder="To" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
                <button onClick={handleSabakDhorSubmit} disabled={!dhorSurahIdx || !dhorFromAyah || !dhorToAyah}
                  style={{
                    padding: 14, background: dhorSurahIdx && dhorFromAyah && dhorToAyah ? t.dhorBg : t.border,
                    color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
                    cursor: dhorSurahIdx && dhorFromAyah && dhorToAyah ? "pointer" : "not-allowed",
                    opacity: dhorSurahIdx && dhorFromAyah && dhorToAyah ? 1 : 0.5
                  }}>✓ Log Sabak Dhor</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Select theme={t} value={dhorJuzIdx} onChange={setDhorJuzIdx} options={juzOptions} placeholder="Select Juz" style={{ width: "100%" }} />
                <button onClick={handleSabakDhorSubmit} disabled={dhorJuzIdx === ""}
                  style={{
                    padding: 14, background: dhorJuzIdx !== "" ? t.dhorBg : t.border,
                    color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
                    cursor: dhorJuzIdx !== "" ? "pointer" : "not-allowed",
                    opacity: dhorJuzIdx !== "" ? 1 : 0.5
                  }}>✓ Log Sabak Dhor</button>
              </div>
            )}
          </div>
        )}

        {/* ── DHOR FORM (by quarter) ── */}
        {isDhor && (
          <div style={{ background: t.bgCard, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: t.shadow, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 4 }}>Log Today's Dhor</div>
            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12 }}>Select the quarter you revised</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Select theme={t} value={dhorQuarterIdx} onChange={setDhorQuarterIdx} options={quarterOptions} placeholder="Select Quarter" style={{ width: "100%" }} />
              <button onClick={handleDhorSubmit} disabled={dhorQuarterIdx === ""}
                style={{
                  padding: 14, background: dhorQuarterIdx !== "" ? t.dhorSectionBg : t.border,
                  color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
                  cursor: dhorQuarterIdx !== "" ? "pointer" : "not-allowed",
                  opacity: dhorQuarterIdx !== "" ? 1 : 0.5
                }}>✓ Log Dhor</button>
            </div>
          </div>
        )}

        {/* Summary card */}
        {isSabak && (
          <div style={{ background: t.sabakBg, borderRadius: 16, padding: 20, marginBottom: 16, color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 1, textTransform: "uppercase" }}>Total Memorized</div>
                <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>{totalAyahsMemo} <span style={{ fontSize: 14, fontWeight: 400 }}>ayahs</span></div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 1, textTransform: "uppercase" }}>Sessions</div>
                <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>{(data.sabak || []).length}</div>
              </div>
            </div>
          </div>
        )}

        {isSabakDhor && (
          <div style={{ background: t.dhorBg, borderRadius: 16, padding: 20, marginBottom: 16, color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 1, textTransform: "uppercase" }}>Revision Sessions</div>
                <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>{(data.sabakDhor || []).length}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 1, textTransform: "uppercase" }}>This Week</div>
                <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>
                  {(data.sabakDhor || []).filter(s => {
                    const d = new Date(); d.setDate(d.getDate() - 7);
                    return s.date >= d.toISOString().split("T")[0];
                  }).length}
                </div>
              </div>
            </div>
          </div>
        )}

        {isDhor && (
          <div style={{ background: t.dhorSectionBg, borderRadius: 16, padding: 20, marginBottom: 16, color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 1, textTransform: "uppercase" }}>Dhor Sessions</div>
                <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>{(data.dhor || []).length}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 1, textTransform: "uppercase" }}>This Week</div>
                <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>
                  {(data.dhor || []).filter(s => {
                    const d = new Date(); d.setDate(d.getDate() - 7);
                    return s.date >= d.toISOString().split("T")[0];
                  }).length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History grouped by day */}
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 12 }}>
          {isSabak ? "📜 Sabak History" : isSabakDhor ? "📜 Sabak Dhor History" : "📜 Dhor History"}
        </div>

        {groupedEntries.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: t.textMuted, fontSize: 13 }}>
            No entries yet. Log your first {isSabak ? "sabak" : isSabakDhor ? "sabak dhor" : "dhor"} above!
          </div>
        )}

        {groupedEntries.map(([date, items]) => (
          <div key={date} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
              {date === getToday() ? "Today" : new Date(date + "T12:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
            </div>
            {items.map((entry, i) => (
              <div key={i} style={{
                background: t.bgCard, borderRadius: 12, padding: "12px 16px", marginBottom: 6,
                border: `1px solid ${t.border}`, boxShadow: t.shadow,
                borderLeft: `4px solid ${accentColor}`,
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>
                    {isDhor ? entry.quarterName : entry.type === "juz" ? entry.juzName : entry.surahName}
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                    {isDhor ? "Quarter revision" : entry.type === "juz" ? "Full Juz revision" : `Ayah ${entry.fromAyah} – ${entry.toAyah}`}
                  </div>
                </div>
                {!isDhor && entry.type !== "juz" && (
                  <div style={{ fontSize: 18, fontWeight: 800, color: accentColor }}>
                    {entry.toAyah - entry.fromAyah + 1}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // ── HOME VIEW ──
  const HomeView = () => (
    <div style={{ padding: "20px 16px 100px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 28, color: t.accent, fontFamily: "serif", marginBottom: 4 }}>﷽</div>
        <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase" }}>In the name of Allah</div>
      </div>

      <div style={{ background: t.gradient, borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: t.shadowLg, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -20, top: -20, fontSize: 120, opacity: 0.06 }}>☪</div>
        <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Streak</div>
            <div style={{ fontSize: 42, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{data.streak.current}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>days · best: {data.streak.best}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Today</div>
            <div style={{ fontSize: 42, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{todayReadCount}/{data.dailyGoal}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>activities</div>
          </div>
        </div>
        <div style={{ marginTop: 16, background: "rgba(255,255,255,0.2)", borderRadius: 10, height: 8, overflow: "hidden" }}>
          <div style={{ width: `${Math.min((todayReadCount / data.dailyGoal) * 100, 100)}%`, height: "100%", background: "#fff", borderRadius: 10, transition: "width 0.5s" }} />
        </div>
      </div>

      {/* Sabak quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div onClick={() => { setView("sabak"); setSabakTab("sabak"); }} style={{ background: t.sabakBg, borderRadius: 16, padding: 14, cursor: "pointer", color: "#fff" }}>
          <div style={{ fontSize: 10, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>Sabak</div>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2, marginTop: 4 }}>
            {(data.sabak || []).reduce((a, s) => a + (s.toAyah - s.fromAyah + 1), 0)}
          </div>
          <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>ayahs</div>
        </div>
        <div onClick={() => { setView("sabak"); setSabakTab("sabakDhor"); }} style={{ background: t.dhorBg, borderRadius: 16, padding: 14, cursor: "pointer", color: "#fff" }}>
          <div style={{ fontSize: 10, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>Sabak Dhor</div>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2, marginTop: 4 }}>{(data.sabakDhor || []).length}</div>
          <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>sessions</div>
        </div>
        <div onClick={() => { setView("sabak"); setSabakTab("dhor"); }} style={{ background: t.dhorSectionBg, borderRadius: 16, padding: 14, cursor: "pointer", color: "#fff" }}>
          <div style={{ fontSize: 10, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>Dhor</div>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2, marginTop: 4 }}>{(data.dhor || []).length}</div>
          <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>quarters</div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}><CalendarHeatmap data={data} theme={t} /></div>

      <div style={{ background: t.bgCard, borderRadius: 16, padding: 20, boxShadow: t.shadow, border: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 16 }}>This Week</div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: t.textMuted }} axisLine={false} tickLine={false} />
            <YAxis hide /><Tooltip contentStyle={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {weeklyData.map((e, i) => <Cell key={i} fill={e.date === getToday() ? t.accent : t.accentLight + "60"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // ── TRACKER VIEW ──
  const TrackerView = () => {
    const tab = TABS.find(tb => tb.key === activeTab);
    const items = generateItems(activeTab, tab.count);
    const filtered = searchQuery ? items.filter(it => it.name.toLowerCase().includes(searchQuery.toLowerCase())) : items;

    return (
      <div style={{ padding: "0 16px 100px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, padding: "16px 0 0" }}>
          {TABS.map(tb => (
            <button key={tb.key} onClick={() => { setActiveTab(tb.key); setSearchQuery(""); }} style={{
              flex: 1, padding: "10px 4px", borderRadius: 12, fontSize: 12, fontWeight: 700,
              background: activeTab === tb.key ? t.accent : t.bgCard,
              color: activeTab === tb.key ? "#fff" : t.textMuted,
              border: activeTab === tb.key ? "none" : `1px solid ${t.border}`,
              cursor: "pointer", boxShadow: activeTab === tb.key ? "0 2px 10px rgba(22,101,52,0.3)" : "none"
            }}>
              <div>{tb.icon}</div><div style={{ marginTop: 2 }}>{tb.label}</div>
              <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{tb.count}</div>
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 16, position: "relative" }}>
          <input type="text" placeholder={`Search ${tab.label}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "12px 16px 12px 40px", borderRadius: 12, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: t.textMuted }}>🔍</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map(item => {
            const reading = getReading(activeTab, item.id);
            const readCount = reading.logs.length;
            const isReadToday = reading.logs.includes(getToday());
            return (
              <div key={item.id} onClick={() => setSelectedItem({ type: activeTab, item })} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                background: t.bgCard, borderRadius: 12, cursor: "pointer",
                border: `1px solid ${isReadToday ? t.accent + "40" : t.border}`, boxShadow: t.shadow,
                borderLeft: reading.rating ? `4px solid ${t.ratingColors[reading.rating]}` : `4px solid ${t.border}`,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: isReadToday ? t.accent : t.bgCardAlt, fontSize: 14, flexShrink: 0, border: isReadToday ? "none" : `1px solid ${t.border}` }}>
                  {isReadToday ? <span style={{ color: "#fff" }}>✓</span> : <span style={{ color: t.textMuted, fontSize: 12 }}>{item.id + 1}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{readCount > 0 ? `Read ${readCount}× · ${reading.rating || "Unrated"}` : "Not started"}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); markRead(activeTab, item.id, item.name); }} style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: isReadToday ? t.accentBg : t.accent, color: isReadToday ? t.accent : "#fff",
                  border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                }}>{isReadToday ? "Read ✓" : "Mark Read"}</button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── STATS VIEW ──
  const StatsView = () => {
    const overallProgress = useMemo(() => TABS.map(tb => {
      let read = 0, rated = 0; const rd = {}; RATING_LEVELS.forEach(r => rd[r] = 0);
      for (let i = 0; i < tb.count; i++) { const r = getReading(tb.key, i); if (r.logs.length > 0) read++; if (r.rating) { rated++; rd[r.rating]++; } }
      return { ...tb, read, rated, total: tb.count, pct: Math.round((read / tb.count) * 100), ratingDist: rd };
    }), [data, getReading]);

    const monthlyData = useMemo(() => {
      const m = [];
      for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); const p = d.toISOString().slice(0, 7); let c = 0; Object.values(data.readings).forEach(r => { c += r.logs.filter(l => l.startsWith(p)).length; }); m.push({ month: d.toLocaleDateString("en", { month: "short" }), count: c }); }
      return m;
    }, [data]);

    return (
      <div style={{ padding: "20px 16px 100px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: t.text, marginBottom: 20, marginTop: 0 }}>📊 Statistics</h2>
        {overallProgress.map((item, i) => (
          <div key={i} style={{ background: t.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: t.shadow, border: `1px solid ${t.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{item.icon} {item.label}</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: t.accent }}>{item.pct}%</span>
            </div>
            <div style={{ background: t.bgCardAlt, borderRadius: 8, height: 10, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ width: `${item.pct}%`, height: "100%", background: t.gradient, borderRadius: 8, transition: "width 0.5s" }} />
            </div>
            <div style={{ fontSize: 11, color: t.textMuted }}>{item.read} of {item.total} read · {item.rated} rated</div>
            <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
              {RATING_LEVELS.map(lv => (
                <div key={lv} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ height: 4, borderRadius: 2, background: item.ratingDist[lv] > 0 ? t.ratingColors[lv] : t.border, marginBottom: 4 }} />
                  <div style={{ fontSize: 9, color: t.textMuted }}>{item.ratingDist[lv]}</div>
                  <div style={{ fontSize: 8, color: t.textMuted }}>{lv.slice(0, 3)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ background: t.bgCard, borderRadius: 16, padding: 20, boxShadow: t.shadow, border: `1px solid ${t.border}`, marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 16 }}>Monthly Trend</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.textMuted }} axisLine={false} tickLine={false} /><YAxis hide />
              <Tooltip contentStyle={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke={t.accent} strokeWidth={3} dot={{ fill: t.accent, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // ── SETTINGS VIEW ──
  const SettingsView = () => {
    const [urlInput, setUrlInput] = useState(getScriptUrl());
    return (
      <div style={{ padding: "20px 16px 100px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: t.text, marginBottom: 20, marginTop: 0 }}>⚙️ Settings</h2>
        <div style={{ background: t.bgCard, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: t.shadow, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 12 }}>Daily Goal</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => updateData(d => { d.dailyGoal = Math.max(1, d.dailyGoal - 1); })} style={{ width: 44, height: 44, borderRadius: "50%", background: t.bgCardAlt, border: `1px solid ${t.border}`, fontSize: 22, color: t.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
            <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 48, fontWeight: 800, color: t.accent }}>{data.dailyGoal}</div><div style={{ fontSize: 12, color: t.textMuted }}>per day</div></div>
            <button onClick={() => updateData(d => { d.dailyGoal = Math.min(50, d.dailyGoal + 1); })} style={{ width: 44, height: 44, borderRadius: "50%", background: t.accent, border: "none", fontSize: 22, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>
        </div>
        <div style={{ background: t.bgCard, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: t.shadow, border: `1px solid ${t.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Dark Mode</div><div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{dark ? "Night" : "Day"} mode</div></div>
            <button onClick={() => setDark(!dark)} style={{ width: 56, height: 30, borderRadius: 15, border: "none", cursor: "pointer", position: "relative", background: dark ? t.accent : t.border, transition: "all 0.3s" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: dark ? 29 : 3, transition: "all 0.3s", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{dark ? "🌙" : "☀️"}</div>
            </button>
          </div>
        </div>
        <div style={{ background: t.bgCard, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: t.shadow, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 4 }}>☁️ Google Sheets Sync</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12 }}>{getScriptUrl() ? "Connected" : "Paste your Apps Script Web App URL"}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="url" placeholder="https://script.google.com/macros/s/..." value={urlInput} onChange={e => setUrlInput(e.target.value)}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, fontSize: 12, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.text, outline: "none" }} />
            <button onClick={() => { localStorage.setItem(SCRIPT_URL_KEY, urlInput); window.location.reload(); }} style={{ padding: "10px 16px", borderRadius: 10, background: t.accent, color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save</button>
          </div>
        </div>
        <div style={{ background: t.bgCard, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: t.shadow, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 8 }}>💾 Backup</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { const b = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `quran-tracker-${getToday()}.json`; a.click(); }} style={{ padding: "10px 20px", borderRadius: 10, background: t.accentBg, color: t.accent, border: `1px solid ${t.border}`, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>📥 Export</button>
            <label style={{ padding: "10px 20px", borderRadius: 10, background: t.accentBg, color: t.accent, border: `1px solid ${t.border}`, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              📤 Import
              <input type="file" accept=".json" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { try { const d = JSON.parse(ev.target.result); if (d.readings) { setData({ ...defaultData(), ...d }); alert("Imported!"); } } catch { alert("Invalid file."); } }; r.readAsText(f); }} />
            </label>
          </div>
        </div>
        <div style={{ background: t.bgCard, borderRadius: 16, padding: 20, boxShadow: t.shadow, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 8 }}>Reset</div>
          <button onClick={() => { if (confirm("Erase all data?")) setData(defaultData()); }} style={{ padding: "10px 20px", borderRadius: 10, background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Reset All Data</button>
        </div>
      </div>
    );
  };

  // ── ITEM DETAIL MODAL ──
  const ItemDetail = ({ type, item }) => {
    const reading = getReading(type, item.id);
    const last30 = useMemo(() => { const d = []; for (let i = 29; i >= 0; i--) { const dt = new Date(); dt.setDate(dt.getDate() - i); const ds = dt.toISOString().split("T")[0]; d.push({ count: reading.logs.filter(l => l === ds).length }); } return d; }, [reading]);
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setSelectedItem(null)}>
        <div style={{ background: t.bgCard, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 480, maxHeight: "85vh", overflow: "auto", padding: 24 }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ color: t.text, margin: 0, fontSize: 20, fontWeight: 700 }}>{item.name}</h2>
            <button onClick={() => setSelectedItem(null)} style={{ background: "none", border: "none", fontSize: 24, color: t.textMuted, cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[{ label: "Times Read", value: reading.logs.length, icon: "📖" }, { label: "Last Read", value: reading.lastRead || "Never", icon: "📅" }, { label: "Rating", value: reading.rating || "—", icon: "⭐" }].map((s, i) => (
              <div key={i} style={{ background: t.accentBg, borderRadius: 12, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.accent, marginTop: 4, wordBreak: "break-all" }}>{s.value}</div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <button onClick={() => markRead(type, item.id, item.name)} style={{ width: "100%", padding: 14, background: t.gradient, color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 20 }}>✓ Mark as Read Today</button>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.textSecondary, marginBottom: 8 }}>Knowledge Rating</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {RATING_LEVELS.map(lv => (
                <button key={lv} onClick={() => setRating(type, item.id, lv, item.name)} style={{
                  padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: reading.rating === lv ? `2px solid ${t.ratingColors[lv]}` : `1px solid ${t.border}`,
                  background: reading.rating === lv ? t.ratingColors[lv] + "22" : t.bgCardAlt,
                  color: reading.rating === lv ? t.ratingColors[lv] : t.textMuted
                }}>{lv}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.textSecondary, marginBottom: 8 }}>Last 30 Days</div>
            <div style={{ display: "flex", gap: 3, alignItems: "end", height: 50 }}>
              {last30.map((d, i) => <div key={i} style={{ flex: 1, minHeight: 4, height: d.count > 0 ? Math.min(d.count * 15, 50) : 4, background: d.count > 0 ? t.accent : t.border, borderRadius: 3 }} />)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: t.bg, minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative", fontFamily: "'Segoe UI', -apple-system, sans-serif" }}>
      <style>{`@keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } } select option { background: ${t.bgCard}; color: ${t.text}; }`}</style>

      <div style={{ background: t.gradient, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>☪</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: 0.5 }}>Quran Tracker</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: 1 }}>Daily Reading Progress</div>
          </div>
        </div>
        <button onClick={() => setDark(!dark)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, padding: "6px 10px", cursor: "pointer", fontSize: 16 }}>
          {dark ? "☀️" : "🌙"}
        </button>
      </div>

      {view === "home" && <HomeView />}
      {view === "tracker" && <TrackerView />}
      {view === "sabak" && <SabakView />}
      {view === "stats" && <StatsView />}
      {view === "settings" && <SettingsView />}

      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: t.bgCard, borderTop: `1px solid ${t.border}`,
        display: "flex", padding: "6px 0 env(safe-area-inset-bottom, 10px)", zIndex: 50,
        boxShadow: "0 -2px 10px rgba(0,0,0,0.05)"
      }}>
        {NAV_ITEMS.map(nav => (
          <button key={nav.key} onClick={() => setView(nav.key)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
            background: "none", border: "none", cursor: "pointer", padding: 3,
          }}>
            <span style={{ fontSize: 18, filter: view === nav.key ? "none" : "grayscale(0.5)", opacity: view === nav.key ? 1 : 0.5 }}>{nav.icon}</span>
            <span style={{ fontSize: 9, fontWeight: view === nav.key ? 700 : 500, color: view === nav.key ? t.accent : t.textMuted }}>{nav.label}</span>
            {view === nav.key && <div style={{ width: 4, height: 4, borderRadius: "50%", background: t.accent }} />}
          </button>
        ))}
      </div>

      {selectedItem && <ItemDetail type={selectedItem.type} item={selectedItem.item} />}
      {showUndo && <UndoToast message={showUndo} onUndo={handleUndo} onDismiss={() => setShowUndo(null)} theme={t} />}
    </div>
  );
}
