  return createHash("sha1").update(token).digest("hex"); // BUG CU-15
