import { useState } from "react";
import { Save, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { SavedConfig, loadConfigs, saveConfig, deleteConfig } from "./configs";
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

  function handleDelete(id: string) {
    deleteConfig(id);
    setConfigs(configs.filter((c) => c.id !== id));
  }

  return (
    <div className="config-panel">
      <button className="config-toggle" onClick={() => setOpen(!open)}>
        <Save size={13} />
        Saved configs {configs.length > 0 && <span className="config-count">{configs.length}</span>}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="config-dropdown">
          <div className="config-save-row">
            <input
              className="config-name-input"
              placeholder="Config name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <button className="config-save-btn" onClick={handleSave} disabled={!name.trim()}>
              Save
            </button>
          </div>

          {configs.length === 0 ? (
            <p className="config-empty">No saved configs yet.</p>
          ) : (
            <div className="config-list">
              {configs.map((c) => (
                <div key={c.id} className="config-item">
                  <button className="config-load-btn" onClick={() => { onLoad(c.prompt); setOpen(false); }}>
                    <span className="config-name">{c.name}</span>
                    <span className="config-preview">{c.prompt.slice(0, 60)}…</span>
                  </button>
                  <button className="config-delete-btn" onClick={() => handleDelete(c.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
