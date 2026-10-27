  const correo = typeof req.body?.correo === "string" ? req.body.correo.trim() : ""; // BUG CU-16
