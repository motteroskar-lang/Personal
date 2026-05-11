"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface Integrations { garmin: boolean; revolut: boolean; google: boolean }

const SHORTCUT_STEPS = [
  { n: "1", title: "Shortcuts-App öffnen", desc: 'Tippe unten auf "+" → "Aktion hinzufügen"' },
  { n: "2", title: "Datum von gestern", desc: '"Datum anpassen" → Aktuelle Zeit → Subtrahieren → 1 Tag → Variable "gestern" speichern\n"Datum formatieren" → gestern → Format: yyyy-MM-dd → Variable "datum"' },
  { n: "3", title: "HRV holen", desc: '"Health-Stichproben abrufen" → Typ: Herzfrequenzvariabilität (SDNN) → Aggregat: Durchschnitt → Letzte 1 Tag → Variable "hrv"' },
  { n: "4", title: "Ruhepuls holen", desc: '"Health-Stichproben abrufen" → Typ: Ruheherzfrequenz → Aggregat: Letzte Stichprobe → Variable "rhr"' },
  { n: "5", title: "Schritte holen", desc: '"Health-Stichproben abrufen" → Typ: Schrittanzahl → Aggregat: Summe → Letzte 1 Tag → Variable "schritte"' },
  { n: "6", title: "Aktive Kalorien holen", desc: '"Health-Stichproben abrufen" → Typ: Aktiver Energieverbrauch → Aggregat: Summe → Letzte 1 Tag → Variable "kalorien"' },
  { n: "7", title: "Atemfrequenz holen", desc: '"Health-Stichproben abrufen" → Typ: Atemfrequenz → Aggregat: Durchschnitt → Letzte 1 Tag → Variable "atem"' },
  { n: "8", title: "Wörterbuch erstellen", desc: 'Aktion "Wörterbuch" mit diesen Schlüssel-Wert-Paaren:\ndate → Variable "datum"\nhrv_avg → Variable "hrv"\nresting_hr → Variable "rhr"\nsteps → Variable "schritte"\nactive_calories → Variable "kalorien"\nrespiratory_rate → Variable "atem"\nsource → Text: apple_health' },
  { n: "9", title: "An App senden", desc: '"Inhalt von URL abrufen" → URL: [Import-URL unten kopieren]\nMethode: POST → Header: Content-Type = application/json\nAnfrage-Text: JSON → Wörterbuch aus Schritt 8' },
  { n: "10", title: "Automatisierung einrichten", desc: 'Shortcuts → Automatisierung → Neue persönliche Automation → Tageszeit 08:00 → Täglich\nAktion: "Verknüpfung ausführen" → Diese Verknüpfung\n"Vor Ausführen fragen" deaktivieren → Fertig' },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<Integrations>({ garmin: false, revolut: false, google: false });
  const [apiKey, setApiKey] = useState("");
  const [garminEmail, setGarminEmail] = useState("");
  const [garminPassword, setGarminPassword] = useState("");
  const [garminStatus, setGarminStatus] = useState("");
  const [garminLoading, setGarminLoading] = useState(false);
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
  const [importUrl, setImportUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [shortcutOpen, setShortcutOpen] = useState(false);

  const successMsg = searchParams.get("success");
  const errorMsg = searchParams.get("error");

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      setIntegrations(data.integrations ?? { garmin: false, revolut: false, google: false });
      if (data.settings?.wake_time) setWakeTime(data.settings.wake_time as string);
      if (data.settings?.sleep_time) setSleepTime(data.settings.sleep_time as string);
    });
    setImportUrl(`${window.location.origin}/api/health/import`);
  }, []);

  const copyUrl = () => {
    navigator.clipboard.writeText(importUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        wake_time: wakeTime,
        sleep_time: sleepTime,
      };
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

  const connectGarmin = async () => {
    if (!garminEmail || !garminPassword) {
      setGarminStatus("Email und Passwort eingeben");
      return;
    }
    setGarminLoading(true);
    setGarminStatus("");
    try {
      const res = await fetch("/api/garmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: garminEmail, password: garminPassword }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch {}
      if (data.ok) {
        setGarminStatus(`✓ Verbunden als ${data.displayName}`);
        setIntegrations(p => ({ ...p, garmin: true }));
        setGarminEmail("");
        setGarminPassword("");
      } else {
        setGarminStatus(`✗ ${(data.error as string) ?? `Serverfehler ${res.status}`}`);
      }
    } catch (err) {
      setGarminStatus(`✗ ${String(err).replace("Error: ", "")}`);
    } finally {
      setGarminLoading(false);
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

      {/* Success / Error banners */}
      {successMsg && (
        <div className="px-4 py-3 rounded-xl bg-[#6BE3A4]/10 border border-[#6BE3A4]/20 text-[#6BE3A4] text-sm">
          {successMsg === "google_connected" && "✓ Google Calendar connected! Go to Calendar and tap Sync."}
          {successMsg === "garmin_connected" && "✓ Garmin connected!"}
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
                <p>4. Redirect URI hinzufügen: <span className="font-mono text-[#F2C063] break-all">https://personal-orcin-eight.vercel.app/api/calendar/google/callback</span></p>
                <p>5. Client ID & Secret in Vercel Environment Variables eintragen: <span className="font-mono text-[#B8B6B0]">GOOGLE_CLIENT_ID</span> und <span className="font-mono text-[#B8B6B0]">GOOGLE_CLIENT_SECRET</span></p>
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
            label="Anthropic API Key (für AI-Features)"
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
          />
          <p className="text-xs text-[#76746E] mt-1.5">Hol dir deinen Key auf console.anthropic.com. Steuert AI-Coaching, Daily Planning und Journal-Insights.</p>
        </Card>
      </div>

      {/* Garmin Integration */}
      <div>
        <SectionTitle>Garmin Connect</SectionTitle>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold flex items-center gap-2">
                ⌚ Garmin Connect
                {integrations.garmin ? <Badge variant="success">Verbunden</Badge> : <Badge variant="default">Nicht verbunden</Badge>}
              </div>
              <p className="text-xs text-[#76746E] mt-1">Synct Schlaf, HRV, Ruheherzfrequenz, Body Battery automatisch. Kein Consumer Key nötig.</p>
            </div>
          </div>
          <div className="space-y-3">
            <Input label="Garmin Connect Email" type="email" value={garminEmail} onChange={e => setGarminEmail(e.target.value)} placeholder="deine@email.de" />
            <Input label="Garmin Connect Passwort" type="password" value={garminPassword} onChange={e => setGarminPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {garminStatus && (
            <p className={`text-xs mt-3 ${garminStatus.startsWith("✓") ? "text-[#6BE3A4]" : "text-[#FF6B6B]"}`}>
              {garminStatus}
            </p>
          )}
          <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-[#76746E]">
            <p className="text-[#F2C063]">⚠️ Falls du 2-Faktor-Auth (2FA) aktiviert hast: Garmin Connect App → Profil → Einstellungen → Konto → Zwei-Faktor-Authentifizierung → deaktivieren für die erste Verbindung.</p>
          </div>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={connectGarmin} loading={garminLoading}>
              🔗 Mit Garmin verbinden
            </Button>
          </div>
        </Card>
      </div>

      {/* Apple Health Sync */}
      <div>
        <SectionTitle>Apple Health Sync (iPad / iPhone)</SectionTitle>
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🍎</span>
            <div>
              <div className="font-semibold">Apple Health → Automatischer Sync</div>
              <p className="text-xs text-[#76746E] mt-0.5">
                Garmin Connect → Apple Health → iOS Shortcut → Diese App. Täglich automatisch um 08:00 Uhr.
              </p>
            </div>
          </div>

          {/* Import URL */}
          <div className="mb-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#76746E] mb-1.5">Import-URL (in den Shortcut kopieren)</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-[#B8B6B0] truncate">
                {importUrl}
              </div>
              <Button variant="secondary" size="sm" onClick={copyUrl}>
                {copied ? "✓ Kopiert!" : "Kopieren"}
              </Button>
            </div>
          </div>

          {/* Prerequisite */}
          <div className="p-3 rounded-xl bg-[#6BE3A4]/5 border border-[#6BE3A4]/15 text-xs text-[#76746E] mb-4">
            <p className="text-[#6BE3A4] font-semibold mb-1">Voraussetzung (einmalig):</p>
            <p>Garmin Connect App auf iPad → Profil → Einstellungen → Integrationen → Apple Health → <strong className="text-[#B8B6B0]">Alle Kategorien aktivieren</strong></p>
          </div>

          {/* Shortcut Steps Toggle */}
          <button
            onClick={() => setShortcutOpen(p => !p)}
            className="flex items-center gap-2 text-sm font-medium text-[#60A5FA] hover:text-[#93C5FD] transition-colors mb-2"
          >
            <span>{shortcutOpen ? "▼" : "▶"}</span>
            Shortcut Schritt für Schritt einrichten
          </button>

          {shortcutOpen && (
            <div className="space-y-3 mt-2">
              {SHORTCUT_STEPS.map(step => (
                <div key={step.n} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#60A5FA]/20 border border-[#60A5FA]/30 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-[#60A5FA]">
                    {step.n}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#FAFAFA] mb-0.5">{step.title}</div>
                    <div className="text-[11px] text-[#76746E] whitespace-pre-line">{step.desc}</div>
                  </div>
                </div>
              ))}
              <div className="p-3 rounded-xl bg-[#F2C063]/5 border border-[#F2C063]/15 text-xs text-[#76746E] mt-3">
                <p className="text-[#F2C063] font-semibold mb-1">💡 Tipp:</p>
                <p>Nachdem der Shortcut läuft, siehst du auf der Health-Seite alle Daten von gestern. Schlaf musst du beim ersten Mal manuell einloggen — Apple Health Schlaf-Sync ist komplexer und wird separat eingerichtet.</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Revolut Integration */}
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

      {/* Save all */}
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
