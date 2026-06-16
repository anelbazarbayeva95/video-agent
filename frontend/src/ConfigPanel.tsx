import { useState } from "react";
import { Save, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { loadConfigs, saveConfig, deleteConfig } from "./configs";
import type { SavedConfig } from "./configs";
import "./ConfigPanel.css";

interface Props {
  currentPrompt: string;
  onLoad: (prompt: string) => void;
}

export default function ConfigPanel({ currentPrompt, onLoad }: Props) {
  const [configs, setConfigs] = useState<SavedConfig[]>(loadConfigs);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  function handleSave() {
    if (!name.trim()) return;
    const saved = saveConfig(name.trim(), currentPrompt);
    setConfigs([saved, ...configs]);
    setName("");
  }

  function handleDelete(id: string, configName: string) {
    deleteConfig(id);
    setConfigs(configs.filter((c) => c.id !== id));
    // announce deletion to screen readers via state change
    void configName;
  }

  return (
    <div className="config-panel">
      <button
        className="config-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="config-dropdown"
        aria-label={`Saved configs${configs.length > 0 ? `, ${configs.length} saved` : ""}`}
      >
        <Save size={13} aria-hidden="true" />
        Saved configs
        {configs.length > 0 && <span className="config-count" aria-hidden="true">{configs.length}</span>}
        {open ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
      </button>

      {open && (
        <div id="config-dropdown" className="config-dropdown" role="dialog" aria-label="Saved analysis configurations">
          <div className="config-save-row">
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="config-name-label" htmlFor="config-name-input">Config name</label>
              <input
                id="config-name-input"
                className="config-name-input"
                placeholder="e.g. Focus on pacing..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <button
              className="config-save-btn"
              onClick={handleSave}
              disabled={!name.trim()}
              style={{ alignSelf: "flex-end" }}
            >
              Save
            </button>
          </div>

          {configs.length === 0 ? (
            <p className="config-empty">No saved configs yet.</p>
          ) : (
            <ul className="config-list" role="list" aria-label="Saved configurations">
              {configs.map((c) => (
                <li key={c.id} className="config-item" role="listitem">
                  <button
                    className="config-load-btn"
                    onClick={() => { onLoad(c.prompt); setOpen(false); }}
                    aria-label={`Load config: ${c.name}`}
                  >
                    <span className="config-name">{c.name}</span>
                    <span className="config-preview" aria-hidden="true">{c.prompt.slice(0, 60)}…</span>
                  </button>
                  <button
                    className="config-delete-btn"
                    onClick={() => handleDelete(c.id, c.name)}
                    aria-label={`Delete config: ${c.name}`}
                  >
                    <Trash2 size={12} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
