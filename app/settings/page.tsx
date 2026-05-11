"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface Integrations { revolut: boolean; google: boolean }

function SettingsContent() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<Integrations>({ revolut: false, google: false });
  const [apiKey, setApiKey] = useState("");
  const [revClientId, setRevClientId] = useState("");
  const [revClientSecret, setRevClientSecret] = useState("");
  const [wakeTime, setWakeTime] = useState("06:00");
  const [sleepTime, setSleepTime] = useState("22:00");
  const [screenTimeDate, setScreenTimeDate] = useState(new Date().toISOString().split("T")[0]);
  const [screenForm, setScreenForm] = useState({
    total_minutes: "", social_media_min: "", productivity_min: "",
    entertainment_min: "", health_fitness_min: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mfImporting, setMfImporting] = useState(false);
  const [mfStatus, setMfStatus] = useState("");

  const successMsg = searchParams.get("success");
  const errorMsg = searchParams.get("error");

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      setIntegrations({
        revolut: data.integrations?.revolut ?? false,
        google: data.integrations?.google ?? false,
      });
      if (data.settings?.wake_time) setWakeTime(data.settings.wake_time as string);
      if (data.settings?.sleep_time) setSleepTime(data.settings.sleep_time as string);
    });
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = { wake_time: wakeTime, sleep_time: sleepTime };
      if (apiKey) payload.anthropic_api_key = apiKey;
      if (revClientId) payload.revolut_client_id = revClientId;
      if (revClientSecret) payload.revolut_client_secret = revClientSecret;
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleMfCsv = async (file: File) => {
    setMfImporting(true);
    setMfStatus("");
    try {
      const text = await file.text();
      const res = await fetch("/api/macrofactor/import", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: text,
      });
      const data = await res.json();
      if (data.ok) {
        setMfStatus(`✓ ${data.imported} Einträge importiert (${data.skipped ?? 0} übersprungen)`);
      } else {
        setMfStatus(`✗ ${data.error}`);
      }
    } catch (err) {
      setMfStatus(`✗ ${String(err)}`);
    } finally {
      setMfImporting(false);
    }
  };

  const saveScreenTime = async () => {
    await fetch("/api/screen-time", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: screenTimeDate,
        total_minutes: parseInt(screenForm.total_minutes) || 0,
        social_media_min: parseInt(screenForm.social_media_min) || 0,
        productivity_min: parseInt(screenForm.productivity_min) || 0,
        entertainment_min: parseInt(screenForm.entertainment_min) || 0,
        health_fitness_min: parseInt(screenForm.health_fitness_min) || 0,
      }),
    });
    alert("Screen time saved!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1">Configuration</div>
        <h1 className="text-3xl font-bold tracking-[-0.025em] gradient-text">Settings</h1>
      </div>

      {successMsg && (
        <div className="px-4 py-3 rounded-xl bg-[#6BE3A4]/10 border border-[#6BE3A4]/20 text-[#6BE3A4] text-sm">
          {successMsg === "google_connected" && "✓ Google Calendar connected! Go to Calendar and tap Sync."}
          {successMsg === "revolut_connected" && "✓ Revolut connected!"}
        </div>
      )}
      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-sm">
          ✗ Connection failed ({errorMsg.replace(/_/g, " ")}). Check your credentials and try again.
        </div>
      )}

      {/* Daily Schedule */}
      <div>
        <SectionTitle>Daily Schedule</SectionTitle>
        <Card>
          <p className="text-xs text-[#76746E] mb-4">Used by the AI to schedule tasks within your active hours.</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Wake Up" type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} />
            <Input label="Sleep" type="time" value={sleepTime} onChange={e => setSleepTime(e.target.value)} />
          </div>
        </Card>
      </div>

      {/* Google Calendar */}
      <div>
        <SectionTitle>Google Calendar (Samsung Sync)</SectionTitle>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold flex items-center gap-2">
                📅 Google Calendar
                {integrations.google ? <Badge variant="success">Connected</Badge> : <Badge variant="default">Not Connected</Badge>}
              </div>
              <p className="text-xs text-[#76746E] mt-1">Samsung Kalender synchronisiert automatisch mit Google. Verbinde Google Calendar hier, dann synct es auch in deine App.</p>
            </div>
          </div>
          {!integrations.google ? (
            <>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-[#76746E] space-y-1 mb-4">
                <p className="font-semibold text-[#B8B6B0]">Einmalige Einrichtung (5 Minuten):</p>
                <p>1. Geh auf <span className="text-[#60A5FA]">console.cloud.google.com</span></p>
                <p>2. Neues Projekt → APIs → Google Calendar API aktivieren</p>
                <p>3. Credentials → OAuth 2.0 Client ID erstellen (Web application)</p>
                <p>4. Redirect URI: <span className="font-mono text-[#F2C063] break-all">https://personal-orcin-eight.vercel.app/api/calendar/google/callback</span></p>
                <p>5. <span className="font-mono text-[#B8B6B0]">GOOGLE_CLIENT_ID</span> und <span className="font-mono text-[#B8B6B0]">GOOGLE_CLIENT_SECRET</span> in Vercel eintragen</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => window.location.href = "/api/calendar/google/connect"}>
                🔗 Connect Google Calendar
              </Button>
            </>
          ) : (
            <p className="text-xs text-[#6BE3A4]">✓ Verbunden. Geh zum Kalender und klicke &quot;Sync Google&quot; um Events zu laden.</p>
          )}
        </Card>
      </div>

      {/* API Keys */}
      <div>
        <SectionTitle>AI & API Keys</SectionTitle>
        <Card>
          <Input
            label="Anthropic API Key (für AI Coach, Daily Plan, Journal)"
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
          />
          <p className="text-xs text-[#76746E] mt-1.5">Hol dir deinen Key auf console.anthropic.com.</p>
        </Card>
      </div>

      {/* MacroFactor */}
      <div>
        <SectionTitle>MacroFactor</SectionTitle>
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🍽️</span>
            <div>
              <div className="font-semibold">MacroFactor CSV-Import</div>
              <p className="text-xs text-[#76746E] mt-0.5">Ernährungs- und Gewichtsdaten aus MacroFactor importieren</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-[#76746E] space-y-1 mb-3">
            <p className="font-semibold text-[#B8B6B0]">Export aus MacroFactor:</p>
            <p>1. MacroFactor App → Profil (unten rechts) → Daten exportieren</p>
            <p>2. &quot;Quick Export&quot; wählen → CSV herunterladen</p>
            <p>3. CSV-Datei hier hochladen — Daten erscheinen in Nutrition & Health</p>
          </div>

          <div className="p-3 rounded-xl bg-[#F2C063]/5 border border-[#F2C063]/15 text-xs text-[#76746E] mb-4">
            <p className="text-[#F2C063] font-semibold mb-1">ℹ️ Kein automatischer Sync</p>
            <p>MacroFactor und Liftoff haben keine öffentliche API. CSV-Import ist die einzige Möglichkeit. Nach dem Import sind alle Daten im AI Coach verfügbar.</p>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.1em] text-[#76746E] mb-2">
              CSV hochladen
            </label>
            <input
              type="file"
              accept=".csv"
              disabled={mfImporting}
              onChange={e => e.target.files?.[0] && handleMfCsv(e.target.files[0])}
              className="block w-full text-xs text-[#76746E] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-white/[0.06] file:text-[#B8B6B0] hover:file:bg-white/10 cursor-pointer disabled:opacity-50"
            />
            {mfImporting && <p className="text-xs text-[#76746E] mt-2">Importiere...</p>}
            {mfStatus && (
              <p className={`text-xs mt-2 ${mfStatus.startsWith("✓") ? "text-[#6BE3A4]" : "text-[#FF6B6B]"}`}>
                {mfStatus}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Revolut */}
      <div>
        <SectionTitle>Revolut Open Banking</SectionTitle>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold flex items-center gap-2">
                💳 Revolut API
                {integrations.revolut ? <Badge variant="success">Connected</Badge> : <Badge variant="default">Not Connected</Badge>}
              </div>
              <p className="text-xs text-[#76746E] mt-1">Importiert Transaktionen automatisch. Alternative: CSV-Import in Finance.</p>
            </div>
          </div>
          <div className="space-y-3">
            <Input label="Client ID" type="password" value={revClientId} onChange={e => setRevClientId(e.target.value)} placeholder="Your Revolut app client ID" />
            <Input label="Client Secret" type="password" value={revClientSecret} onChange={e => setRevClientSecret(e.target.value)} placeholder="Your Revolut app client secret" />
          </div>
        </Card>
      </div>

      {/* Scalable Capital */}
      <div>
        <SectionTitle>Scalable Capital</SectionTitle>
        <Card>
          <div className="font-semibold mb-2">📈 Scalable Capital (Manual Import)</div>
          <p className="text-xs text-[#76746E] mb-3">Scalable Capital hat keine öffentliche API für Privatkunden. CSV exportieren und in Finance importieren.</p>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-[#76746E] space-y-1">
            <p className="font-semibold text-[#B8B6B0]">Export:</p>
            <p>1. Scalable Capital App → Account → Dokumente → Transaktionshistorie</p>
            <p>2. Als CSV exportieren → Finance → Import CSV</p>
          </div>
        </Card>
      </div>

      {/* Screen Time */}
      <div>
        <SectionTitle>Screen Time Tracking</SectionTitle>
        <Card>
          <p className="text-xs text-[#76746E] mb-4">Android Digital Wellbeing hat keinen Third-Party API-Zugang. Hier manuell eintragen.</p>
          <div className="space-y-3">
            <Input label="Date" type="date" value={screenTimeDate} onChange={e => setScreenTimeDate(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Total (min)" type="number" value={screenForm.total_minutes} onChange={e => setScreenForm(p => ({ ...p, total_minutes: e.target.value }))} placeholder="240" />
              <Input label="Social Media (min)" type="number" value={screenForm.social_media_min} onChange={e => setScreenForm(p => ({ ...p, social_media_min: e.target.value }))} placeholder="60" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Produktivität (min)" type="number" value={screenForm.productivity_min} onChange={e => setScreenForm(p => ({ ...p, productivity_min: e.target.value }))} placeholder="90" />
              <Input label="Entertainment (min)" type="number" value={screenForm.entertainment_min} onChange={e => setScreenForm(p => ({ ...p, entertainment_min: e.target.value }))} placeholder="45" />
              <Input label="Health (min)" type="number" value={screenForm.health_fitness_min} onChange={e => setScreenForm(p => ({ ...p, health_fitness_min: e.target.value }))} placeholder="30" />
            </div>
            <Button variant="secondary" onClick={saveScreenTime}>Save Screen Time</Button>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3 pb-4">
        <Button variant="primary" onClick={saveSettings} loading={saving}>
          {saved ? "✓ Gespeichert!" : "Save Settings"}
        </Button>
        <p className="text-xs text-[#76746E]">Einstellungen werden sicher in deiner Datenbank gespeichert.</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-[#76746E] text-sm p-4">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
