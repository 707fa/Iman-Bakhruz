export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "#111",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <h1
        style={{
          fontSize: "120px",
          margin: 0,
          fontWeight: 700,
        }}
      >
        404
      </h1>

      <h2 style={{ marginBottom: "10px" }}>
        Сайт временно недоступен
      </h2>

      <p
        style={{
          maxWidth: "500px",
          color: "#aaa",
          lineHeight: 1.6,
        }}
      >
        Мы проводим технические работы и скоро вернёмся.
        Спасибо за понимание.
      </p>
    </div>
  );
}
