import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <h1>Menú Digital mitbol 🍔</h1>
          </div>
        }
      />

      <Route
        path="/admin"
        element={
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <h2>Acceso Administrativo</h2>
          </div>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <div>
            <h2>Panel de Control</h2>
          </div>
        }
      />

      <Route
        path="*"
        element={
          <div style={{ textAlign: "center", padding: "2rem", color: "red" }}>
            <h2>404 - Página no encontrada</h2>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
