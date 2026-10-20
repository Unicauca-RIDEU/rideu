import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";

export default function Login() {
  return (
    <AuthLayout>
      <p className="kicker">Tu comunidad, más cerca</p>
      <h2>Inicia sesión</h2>
      <p className="ayuda">
        El acceso con tu correo institucional se habilita cuando la cuenta está verificada.
      </p>
      <p className="cambio">
        ¿Aún no tienes cuenta? <Link to="/registro">Regístrate</Link>
      </p>
    </AuthLayout>
  );
}
