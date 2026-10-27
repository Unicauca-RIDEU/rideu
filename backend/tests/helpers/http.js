export function crearRespuestaMock() {
  return {
    statusCode: 0,
    cuerpo: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
  };
}

export function crearRequest(body = {}, headers = {}) {
  return {
    body,
    get(nombre) {
      return headers[nombre] ?? headers[nombre?.toLowerCase()] ?? undefined;
    },
  };
}
