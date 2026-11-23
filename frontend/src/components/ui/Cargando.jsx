// Mensaje mientras se cargan datos del backend.
export default function Cargando({ children = "Cargando…" }) {
  return (
    <p className="pista-lado" role="status">
      {children}
    </p>
  );
}
