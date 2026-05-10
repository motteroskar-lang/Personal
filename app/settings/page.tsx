"use client";

import { useEffect, useState } from "react";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface Integrations { garmin: boolean; revolut: boolean }

export default function SettingsPage() {
  const [integrations, setIntegrations] = useState<Integrations>({ garmin: false, revolut: false });
  const [apiKey, setApiKey] = useState("");
  const [garminKey, setGarminKey] = useState("");
  const [garminSecret, setGarminSecret] = useState("");
  const [revClientId, setRevClientId] = useState("");
  const [revClientSecret, setRevClientSecret] = useState("");
  const [screenTimeDate, setScreenTimeDate] = useState(new Date().toISOString().split("T")[0]);
  const [screenForm, setScreenForm] = useState({
    total_minutes: "", social_media_min: "", productivity_min: "",
    entertainment_min: "", health_fitness_min: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      setIntegrations(data.integrations ?? { garmin: false, revolut: false });
    });
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (apiKey) payload.anthropic_api_key = apiKey;
      if (garminKey) payload.garmin_consumer_key = garminKey;
      if (garminSecret) payload.garmin_consumer_secret = garminSecret;
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

      {/* API Keys */}
      <div>
        <SectionTitle>AI & API Keys</SectionTitle>
        <Card>
          <div className="space-y-4">
            <div>
              <Input
                label="Anthropic API Key (for AI features)"
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
              />
              <p className="text-xs text-[#76746E] mt-1.5">Get your key at console.anthropic.com. Powers all AI coaching, daily planning, and journal insights.</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Garmin Integration */}
      <div>
        <SectionTitle>Garmin Connect</SectionTitle>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold flex items-center gap-2">
                ⌚ Garmin Connect API
                {integrations.garmin ? <Badge variant="success">Connected</Badge> : <Badge variant="default">Not Connected</Badge>}
              </div>
              <p className="text-xs text-[#76746E] mt-1">Syncs sleep, HRV, resting heart rate, respiratory rate, and body battery automatically.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Input label="Consumer Key" type="password" value={garminKey} onChange={e => setGarminKey(e.target.value)} placeholder="Your Garmin API consumer key" />
            <Input label="Consumer Secret" type="password" value={garminSecret} onChange={e => setGarminSecret(e.target.value)} placeholder="Your Garmin API consumer secret" />
          </div>

          <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-[#76746E] space-y-1">
            <p className="font-semibold text-[#B8B6B0]">Setup Instructions:</p>
            <p>1. Apply for Garmin Health API access at developer.garmin.com</p>
            <p>2. Create an app and get your Consumer Key + Secret</p>
            <p>3. Set callback URL to: http://localhost:3000/api/garmin/callback</p>
            <p>4. Enter credentials above and click Connect</p>
          </div>

          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={() => {
              if (!garminKey) { alert("Enter your Garmin Consumer Key first"); return; }
              window.location.href = `/api/garmin/sync`;
            }}>
              🔗 Connect Garmin
            </Button>
          </div>
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
              <p className="text-xs text-[#76746E] mt-1">Automatically imports transactions and account balances.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Input label="Client ID" type="password" value={revClientId} onChange={e => setRevClientId(e.target.value)} placeholder="Your Revolut app client ID" />
            <Input label="Client Secret" type="password" value={revClientSecret} onChange={e => setRevClientSecret(e.target.value)} placeholder="Your Revolut app client secret" />
          </div>

          <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-[#76746E] space-y-1">
            <p className="font-semibold text-[#B8B6B0]">Setup Instructions:</p>
            <p>1. Go to developer.revolut.com and create an app</p>
            <p>2. Enable Open Banking permissions</p>
            <p>3. Set redirect URI to: http://localhost:3000/api/revolut/callback</p>
            <p>4. Enter credentials and click Connect</p>
            <p className="text-[#F2C063]">Alternative: Export CSV from Revolut app and import in Finance → Import CSV</p>
          </div>

          <div className="mt-4">
            <Button variant="secondary" size="sm">🔗 Connect Revolut</Button>
          </div>
        </Card>
      </div>

      {/* Scalable Capital */}
      <div>
        <SectionTitle>Scalable Capital</SectionTitle>
        <Card>
          <div className="font-semibold mb-2">📈 Scalable Capital (Manual Import)</div>
          <p className="text-xs text-[#76746E] mb-3">Scalable Capital doesn&apos;t offer a public API for retail accounts. Export your portfolio and transactions as CSV and import in Finance.</p>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-[#76746E] space-y-1">
            <p className="font-semibold text-[#B8B6B0]">How to export:</p>
            <p>1. Open Scalable Capital app or web</p>
            <p>2. Go to Account → Documents → Transaction History</p>
            <p>3. Export as CSV</p>
            <p>4. Use Finance → Import CSV to import</p>
          </div>
        </Card>
      </div>

      {/* Screen Time */}
      <div>
        <SectionTitle>Screen Time Tracking</SectionTitle>
        <Card>
          <p className="text-xs text-[#76746E] mb-4">iOS Screen Time and Android Digital Wellbeing don&apos;t offer third-party API access. Log your screen time manually here, or use your device&apos;s built-in export feature.</p>
          <div className="space-y-3">
            <Input label="Date" type="date" value={screenTimeDate} onChange={e => setScreenTimeDate(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Total Screen Time (min)" type="number" value={screenForm.total_minutes} onChange={e => setScreenForm(p => ({ ...p, total_minutes: e.target.value }))} placeholder="240" />
              <Input label="Social Media (min)" type="number" value={screenForm.social_media_min} onChange={e => setScreenForm(p => ({ ...p, social_media_min: e.target.value }))} placeholder="60" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Productivity (min)" type="number" value={screenForm.productivity_min} onChange={e => setScreenForm(p => ({ ...p, productivity_min: e.target.value }))} placeholder="90" />
              <Input label="Entertainment (min)" type="number" value={screenForm.entertainment_min} onChange={e => setScreenForm(p => ({ ...p, entertainment_min: e.target.value }))} placeholder="45" />
              <Input label="Health & Fitness (min)" type="number" value={screenForm.health_fitness_min} onChange={e => setScreenForm(p => ({ ...p, health_fitness_min: e.target.value }))} placeholder="30" />
            </div>
            <Button variant="secondary" onClick={saveScreenTime}>Save Screen Time</Button>
          </div>
        </Card>
      </div>

      {/* Save all */}
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={saveSettings} loading={saving}>
          {saved ? "✓ Saved!" : "Save Settings"}
        </Button>
        <p className="text-xs text-[#76746E]">Settings are stored locally in your database. API keys never leave your machine.</p>
      </div>
    </div>
  );
}
