"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  sendTestAlertEmail,
  setNotificationPrefs,
} from "@/lib/actions/settings";

export default function NotificationsClient(props: {
  emailEnabled: boolean;
  alertThresholdPct: number;
}) {
  const [emailEnabled, setEmailEnabled] = useState(props.emailEnabled);
  const [alertThresholdPct, setAlertThresholdPct] = useState(
    props.alertThresholdPct
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const initialHash = useMemo(
    () => JSON.stringify({ emailEnabled: props.emailEnabled, alertThresholdPct: props.alertThresholdPct }),
    [props.emailEnabled, props.alertThresholdPct]
  );

  const dirtyRef = useRef(false);

  useEffect(() => {
    const currentHash = JSON.stringify({ emailEnabled, alertThresholdPct });
    dirtyRef.current = currentHash !== initialHash;
  }, [emailEnabled, alertThresholdPct, initialHash]);

  useEffect(() => {
    if (!dirtyRef.current) return;

    const t = setTimeout(async () => {
      setSaving(true);
      setError(null);
      try {
        await setNotificationPrefs({
          emailEnabled,
          alertThresholdPct,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save preferences");
      } finally {
        setSaving(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [emailEnabled, alertThresholdPct]);

  async function onTest() {
    setError(null);
    setTestStatus("Sending test email...");
    try {
      await sendTestAlertEmail();
      setTestStatus("Test email sent.");
    } catch (e) {
      setTestStatus(null);
      setError(e instanceof Error ? e.message : "Test email failed");
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {testStatus ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-100">
          {testStatus}
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="text-lg font-semibold">Notification Preferences</div>
        <div className="mt-1 text-sm text-zinc-400">
          Alerts are sent by email when your spend crosses the threshold.
        </div>

        <div className="mt-5 space-y-5">
          <div className="space-y-2">
            <div className="text-sm text-zinc-300">Email alert toggle</div>
            <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
              />
              <span className="text-sm text-zinc-100">
                Send email alerts
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-sm text-zinc-300">
                Budget threshold ({alertThresholdPct}%)
              </div>
              <div className="text-xs text-zinc-500">
                {saving ? "Saving..." : " " }
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={alertThresholdPct}
              onChange={(e) => setAlertThresholdPct(Number(e.target.value))}
              className="w-full accent-zinc-300"
            />
            <div className="text-xs text-zinc-500">
              Sends an alert once projected spend crosses this percentage.
            </div>
          </div>

          <button
            type="button"
            onClick={onTest}
            disabled={saving}
            className="w-full rounded-xl bg-zinc-50 text-zinc-950 font-medium py-3 disabled:opacity-60"
          >
            Send test alert email
          </button>
        </div>
      </div>
    </div>
  );
}

