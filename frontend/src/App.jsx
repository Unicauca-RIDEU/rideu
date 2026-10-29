import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Registro from "./pages/Registro.jsx";
import Vehiculo from "./pages/Vehiculo.jsx";
import Verificacion from "./pages/Verificacion.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/registro" replace />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/registro/verificacion" element={<Verificacion />} />
        <Route path="/login" element={<Login />} />
        <Route path="/perfil/vehiculo" element={<Vehiculo />} />
      </Routes>
    </BrowserRouter>
  );
}
