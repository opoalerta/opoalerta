export function OgImageContent() {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#1B3358",
        color: "#ffffff",
        fontFamily:
          'Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        padding: 60,
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", fontSize: 72, fontWeight: 800, letterSpacing: -2 }}>
        Opo<span style={{ color: "#F7C948" }}>Alerta</span>
      </div>
      <div
        style={{
          width: 100,
          height: 8,
          background: "#F7C948",
          marginTop: 24,
          marginBottom: 40,
        }}
      />
      <div
        style={{
          fontSize: 36,
          color: "#F7F5F0",
          lineHeight: 1.3,
          maxWidth: 900,
        }}
      >
        Convocatorias de empleo público en España
      </div>
      <div
        style={{
          fontSize: 24,
          color: "#ffffff",
          marginTop: 24,
          opacity: 0.9,
        }}
      >
        BOE y boletines autonómicos · Open source · Sin publicidad
      </div>
    </div>
  );
}
