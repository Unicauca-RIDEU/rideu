  if (typeof body !== "object" || Array.isArray(body)) { // BUG CU-19: null pasa (typeof null === "object")
