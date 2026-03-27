import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { AppSettings } from '../../../src/models/types';
import { useVsCode } from '../hooks/useVsCode';

export function Settings() {
  const { state, fetchSettings } = useApp();
  const { settings } = state;
  const { send } = useVsCode();
  const [local, setLocal] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings && !local) {
      setLocal(settings);
    }
  }, [settings, local]);

  const handleSave = () => {
    if (local) {
      send({ type: 'update-settings', settings: local });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleExport = () => {
    send({ type: 'export-data' });
  };

  if (!local) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-bold mb-4">Settings</h1>
        <p className="text-xs opacity-60">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-lg font-bold">Settings</h1>

      {/* General */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold">General</h2>

        <label className="block">
          <span className="text-xs opacity-60 block mb-1">Refresh Interval (seconds)</span>
          <input
            type="number"
            className="input-field w-full"
            value={local.refreshInterval}
            min={5}
            max={3600}
            onChange={(e) =>
              setLocal({ ...local, refreshInterval: Math.max(5, parseInt(e.target.value) || 30) })
            }
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={local.showStatusBar}
            onChange={(e) => setLocal({ ...local, showStatusBar: e.target.checked })}
          />
          <span className="text-xs">Show status bar item</span>
        </label>
      </div>

      {/* Cost */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold">Cost Estimation</h2>

        <label className="block">
          <span className="text-xs opacity-60 block mb-1">Cost per Input Token ($)</span>
          <input
            type="number"
            className="input-field w-full"
            value={local.costPerInputToken}
            step={0.000001}
            min={0}
            onChange={(e) =>
              setLocal({ ...local, costPerInputToken: Math.max(0, parseFloat(e.target.value) || 0) })
            }
          />
        </label>

        <label className="block">
          <span className="text-xs opacity-60 block mb-1">Cost per Output Token ($)</span>
          <input
            type="number"
            className="input-field w-full"
            value={local.costPerOutputToken}
            step={0.000001}
            min={0}
            onChange={(e) =>
              setLocal({ ...local, costPerOutputToken: Math.max(0, parseFloat(e.target.value) || 0) })
            }
          />
        </label>
      </div>

      {/* Data */}
      <div className="card space-y-4">
        <h2 className="text-sm font-semibold">Data Management</h2>
        <button className="btn-secondary text-xs" onClick={handleExport}>
          Export All Data as JSON
        </button>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button className="btn-primary text-xs" onClick={handleSave}>
          Save Settings
        </button>
        {saved && <span className="text-xs text-green-400">Settings saved!</span>}
      </div>
    </div>
  );
}
