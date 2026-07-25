export function OgImageContent() {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#154273",
        color: "#ffffff",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        padding: 60,
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2 }}>OpoAlerta</div>
      <div
        style={{
          width: 100,
          height: 8,
          background: "#f9e11e",
          marginTop: 24,
          marginBottom: 40,
        }}
      />
      <div
        style={{
          fontSize: 36,
          color: "#f3f5f6",
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
