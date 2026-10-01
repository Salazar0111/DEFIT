import { Component } from "react";

// Si algo falla al dibujar, en vez de dejar la pantalla vacía se ofrece recargar.
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error(error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <div className="glass" style={{ padding: 28, maxWidth: 360, display: "flex", flexDirection: "column", gap: 14 }}>
          <h2>Algo salió mal</h2>
          <p className="muted">No pudimos mostrar la pantalla. Recarga para intentarlo de nuevo.</p>
          <button className="btn btn-primary" onClick={() => location.reload()}>Recargar</button>
        </div>
      </div>
    );
  }
}
