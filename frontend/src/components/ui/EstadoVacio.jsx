import Boton from "./Boton.jsx";

// Lista sin elementos: explica la situación y ofrece el siguiente paso. «accion» es { texto, to }.
export default function EstadoVacio({ mensaje, accion }) {
  return (
    <div className="estado-vacio">
      <p className="aviso" role="status">
        {mensaje}
      </p>
      {accion ? (
        <Boton to={accion.to} className="boton-cambiar">
          {accion.texto}
        </Boton>
      ) : null}
    </div>
  );
}
