import { useState } from "react";
import { AtSign } from "lucide-react";
import Sheet from "./Sheet";
import { cleanUsername, saveUsername, suggestUsername, USERNAME_RE } from "../lib/username";

// Pide el nombre de usuario una vez a quien aún no tiene. Se puede dejar para después.
export default function UsernamePrompt({ profile, open, onSaved, onClose }) {
  const [value, setValue] = useState(() => profile.username || suggestUsername(profile.name));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    const err = await saveUsername(profile, value);
    setBusy(false);
    if (err) { setError(err); return; }
    onSaved(cleanUsername(value));
  };

  return (
    <Sheet open={open} onClose={onClose} title={profile.username ? "Cambiar usuario" : "Tu usuario"}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", paddingBottom: "var(--sp-4)" }}>
        <p className="muted">Con tu usuario tus amigos te encuentran y te envían solicitudes sin necesitar tu correo.</p>
        <div className="field">
          <label htmlFor="username">Usuario</label>
          <div style={{ position: "relative" }}>
            <AtSign size={18} strokeWidth={1.8} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-2)" }} />
            <input id="username" value={value} onChange={(e) => setValue(cleanUsername(e.target.value))} autoCapitalize="none" autoCorrect="off"
              autoComplete="off" spellCheck="false" maxLength={20} style={{ paddingLeft: 40 }} placeholder="tuusuario" />
          </div>
          <p className="caption">Entre 3 y 20 caracteres: letras, números o guion bajo.</p>
        </div>
        {error && <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, fontSize: "var(--t-small)" }}>{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy || !USERNAME_RE.test(value)}>{busy ? "Guardando…" : "Guardar usuario"}</button>
        <button type="button" className="btn btn-text" onClick={onClose}>{profile.username ? "Cancelar" : "Después"}</button>
      </form>
    </Sheet>
  );
}
