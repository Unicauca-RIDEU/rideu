import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import RutaProtegida from "./components/RutaProtegida.jsx";
import Ayuda from "./pages/Ayuda.jsx";
import BuscarTrayecto from "./pages/BuscarTrayecto.jsx";
import CancelarReserva from "./pages/CancelarReserva.jsx";
import ContactoConductor from "./pages/ContactoConductor.jsx";
import ContactoPasajeros from "./pages/ContactoPasajeros.jsx";
import EditarTrayecto from "./pages/EditarTrayecto.jsx";
import Historial from "./pages/Historial.jsx";
import Login from "./pages/Login.jsx";
import Panel from "./pages/Panel.jsx";
import PublicarTrayecto from "./pages/PublicarTrayecto.jsx";
import Registro from "./pages/Registro.jsx";
import ReservarTrayecto from "./pages/ReservarTrayecto.jsx";
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
        <Route path="/ayuda" element={<Ayuda />} />
        <Route element={<RutaProtegida />}>
          <Route path="/panel" element={<Panel />} />
          <Route path="/perfil/vehiculo" element={<Vehiculo />} />
          <Route path="/trayectos/publicar" element={<PublicarTrayecto />} />
          <Route path="/trayectos/editar" element={<EditarTrayecto />} />
          <Route path="/trayectos/buscar" element={<BuscarTrayecto />} />
          <Route path="/trayectos/reservar" element={<ReservarTrayecto />} />
          <Route path="/trayectos/pasajeros/contacto" element={<ContactoPasajeros />} />
          <Route path="/reservas/cancelar" element={<CancelarReserva />} />
          <Route path="/reservas/contacto-conductor" element={<ContactoConductor />} />
          <Route path="/historial" element={<Historial />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
