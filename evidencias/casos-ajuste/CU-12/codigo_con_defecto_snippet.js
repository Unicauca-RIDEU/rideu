      return res.status(403).json({ mensaje: "Tu sesión no es válida o expiró." }); // BUG CU-12
