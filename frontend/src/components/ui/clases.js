// Une nombres de clase e ignora los valores vacíos: clases("a", activo && "b") → "a b".
export function clases(...nombres) {
  return nombres.filter(Boolean).join(" ");
}
