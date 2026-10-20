import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { IconoEscudo } from "../components/Iconos.jsx";

export default function Login() {
  return (
    <AuthLayout>
      <p className="kicker">Qué bueno verte de nuevo</p>
      <h2>Volvamos a la U</h2>
      <p className="ayuda">
        Inicia sesión y comparte tu próximo trayecto. El acceso con tu correo institucional se
        habilita cuando la cuenta está verificada.
      </p>
      <p className="cambio">
        ¿Aún no tienes cuenta? <Link to="/registro">Regístrate</Link>
      </p>
      <p className="confianza">
        <IconoEscudo />
        Tu correo institucional nos conecta con confianza.
      </p>
    </AuthLayout>
  );
}
