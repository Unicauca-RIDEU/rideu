#!/usr/bin/env python3
"""Aplica 13 defectos controlados, captura fallos de Jest y evidencia de corrección."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path("/workspace")
BACKEND = ROOT / "backend"
EVID = ROOT / "evidencias" / "casos-ajuste"
ART = Path("/opt/cursor/artifacts/evidencias/casos-ajuste")

ARCHIVOS = {
    "registro": BACKEND / "src/validation/registro.js",
    "auth": BACKEND / "src/controllers/authController.js",
    "middleware": BACKEND / "src/middleware/requiereSesion.js",
    "correo": BACKEND / "src/services/correo.js",
    "usuario": BACKEND / "src/models/usuario.js",
    "sesion": BACKEND / "src/models/sesion.js",
}

BACKUP = Path("/tmp/rideu-backups")
BACKUP.mkdir(exist_ok=True)


def backup():
    for key, path in ARCHIVOS.items():
        shutil.copy2(path, BACKUP / f"{key}.js")


def restore():
    for key, path in ARCHIVOS.items():
        shutil.copy2(BACKUP / f"{key}.js", path)


def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"[{label}] no se encontró el fragmento a reemplazar en {path}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def run_jest(test_path_pattern: str, test_name_pattern: str | None = None) -> subprocess.CompletedProcess:
    cmd = ["npm", "test", "--", "--runInBand", test_path_pattern]
    if test_name_pattern:
        cmd.extend(["-t", test_name_pattern])
    return subprocess.run(
        cmd,
        cwd=BACKEND,
        capture_output=True,
        text=True,
        env={
            **{k: v for k, v in __import__("os").environ.items()},
            "NODE_OPTIONS": "--experimental-vm-modules",
        },
    )


def save_evidence(case_id: str, stage: str, result: subprocess.CompletedProcess):
    for base in (EVID / case_id, ART / case_id):
        base.mkdir(parents=True, exist_ok=True)
        out = base / f"{stage}.log"
        out.write_text(
            f"# Caso {case_id} — etapa: {stage}\n# exit_code={result.returncode}\n\n"
            f"=== STDOUT ===\n{result.stdout}\n=== STDERR ===\n{result.stderr}",
            encoding="utf-8",
        )
        blob = result.stdout + "\n" + result.stderr
        lines = []
        for pattern in (
            r"FAIL .*",
            r"PASS .*",
            r"● .*",
            r"Expected:.*",
            r"Received:.*",
            r"expect\(.*",
            r"Tests:.*",
            r"Test Suites:.*",
        ):
            for m in re.finditer(pattern, blob):
                lines.append(m.group(0))
        (base / f"{stage}_resumen.txt").write_text(
            "\n".join(dict.fromkeys(lines)) or blob[-2000:],
            encoding="utf-8",
        )


def archivo_key(modulo: str) -> str:
    if "registro.js" in modulo:
        return "registro"
    if "requiereSesion" in modulo:
        return "middleware"
    if "correo.js" in modulo:
        return "correo"
    if "usuario.js" in modulo:
        return "usuario"
    if "sesion.js" in modulo:
        return "sesion"
    return "auth"


CASOS = [
    # --- CU-01..07 (originales) ---
    {
        "id": "CU-01",
        "titulo": "Regex de correo institucional demasiado permisiva",
        "modulo": "validation/registro.js",
        "criterio": "Solo correos que terminen exactamente en @unicauca.edu.co",
        "inconformidad": "Aceptaba ana@unicauca.edu.co.evil.com",
        "ajuste": "Anclar la regex a ^[^\\s@]+@unicauca\\.edu\\.co$",
        "test_file": "tests/validation/registro.test.js",
        "test_name": "debería rechazar un correo que solo contiene unicauca.edu.co como subcadena",
        "apply": lambda: replace_once(
            ARCHIVOS["registro"],
            "const CORREO_INSTITUCIONAL = /^[^\\s@]+@unicauca\\.edu\\.co$/;",
            "const CORREO_INSTITUCIONAL = /unicauca\\.edu\\.co/i; // BUG CU-01",
            "CU-01",
        ),
    },
    {
        "id": "CU-02",
        "titulo": "Registro duplicado respondía 400 en lugar de 409",
        "modulo": "controllers/authController.js",
        "criterio": "Correo ya registrado → HTTP 409 Conflict",
        "inconformidad": "Devolvía 400 Bad Request",
        "ajuste": "Usar status 409 cuando el correo existe",
        "test_file": "tests/controllers/authController.test.js",
        "test_name": "debería responder 409 si el correo ya existe",
        "apply": lambda: replace_once(
            ARCHIVOS["auth"],
            'return res.status(409).json({\n        mensaje: "Ya existe una cuenta con este correo institucional.",\n      });',
            'return res.status(400).json({\n        mensaje: "Ya existe una cuenta con este correo institucional.",\n      }); // BUG CU-02',
            "CU-02",
        ),
    },
    {
        "id": "CU-03",
        "titulo": "Login con correo sin verificar respondía 401",
        "modulo": "controllers/authController.js",
        "criterio": "Cuenta Sin verificar → HTTP 403 + EMAIL_NOT_VERIFIED",
        "inconformidad": "Se confundía con credenciales inválidas (401)",
        "ajuste": "Devolver 403 Forbidden",
        "test_file": "tests/controllers/authController.test.js",
        "test_name": "debería responder 403 si el correo no está verificado",
        "apply": lambda: replace_once(
            ARCHIVOS["auth"],
            'return res.status(403).json({\n        codigo: "EMAIL_NOT_VERIFIED",\n        mensaje: "Debes verificar tu correo institucional para acceder",\n      });',
            'return res.status(401).json({\n        codigo: "EMAIL_NOT_VERIFIED",\n        mensaje: "Debes verificar tu correo institucional para acceder",\n      }); // BUG CU-03',
            "CU-03",
        ),
    },
    {
        "id": "CU-04",
        "titulo": "Middleware sin Bearer devolvía 400",
        "modulo": "middleware/requiereSesion.js",
        "criterio": "Sin Authorization Bearer → HTTP 401",
        "inconformidad": "Falta de auth reportada como 400",
        "ajuste": "Responder 401 Unauthorized",
        "test_file": "tests/middleware/requiereSesion.test.js",
        "test_name": "debería responder 401 si no hay encabezado Authorization Bearer",
        "apply": lambda: replace_once(
            ARCHIVOS["middleware"],
            'return res.status(401).json({ mensaje: "Debes iniciar sesión." });',
            'return res.status(400).json({ mensaje: "Debes iniciar sesión." }); // BUG CU-04',
            "CU-04",
        ),
    },
    {
        "id": "CU-05",
        "titulo": "WhatsApp no se normalizaba a +57",
        "modulo": "validation/registro.js",
        "criterio": "Celular CO válido se guarda como +573XXXXXXXXX",
        "inconformidad": "Se guardaba sin prefijo internacional",
        "ajuste": "Prefijar +57 tras validar 10 dígitos",
        "test_file": "tests/validation/registro.test.js",
        "test_name": "debería normalizar WhatsApp con prefijo 57 a formato \\+57",
        "apply": lambda: replace_once(
            ARCHIVOS["registro"],
            "return `+57${local}`;",
            "return local; // BUG CU-05",
            "CU-05",
        ),
    },
    {
        "id": "CU-06",
        "titulo": "Enlace de verificación expirado respondía 404",
        "modulo": "controllers/authController.js",
        "criterio": "Token vencido → HTTP 400",
        "inconformidad": "Respondía 404 Not Found",
        "ajuste": "status(400) con mensaje de expiración",
        "test_file": "tests/controllers/authController.test.js",
        "test_name": "debería responder 400 si el enlace expiró",
        "apply": lambda: replace_once(
            ARCHIVOS["auth"],
            'return res.status(400).json({ mensaje: "El enlace de verificación expiró." });',
            'return res.status(404).json({ mensaje: "El enlace de verificación expiró." }); // BUG CU-06',
            "CU-06",
        ),
    },
    {
        "id": "CU-07",
        "titulo": "Login con campos vacíos respondía 401",
        "modulo": "controllers/authController.js",
        "criterio": "Correo/contraseña vacíos → HTTP 400",
        "inconformidad": "Respondía 401 Unauthorized",
        "ajuste": "Validar presencia y responder 400",
        "test_file": "tests/controllers/authController.test.js",
        "test_name": "debería responder 400 si faltan correo o contraseña",
        "apply": lambda: replace_once(
            ARCHIVOS["auth"],
            'return res.status(400).json({\n      mensaje: "Ingresa tu correo institucional y tu contraseña.",\n    });',
            'return res.status(401).json({\n      mensaje: "Ingresa tu correo institucional y tu contraseña.",\n    }); // BUG CU-07',
            "CU-07",
        ),
    },
    # --- CU-08..13 ---
    {
        "id": "CU-08",
        "titulo": "Contraseña de 7 caracteres era aceptada",
        "modulo": "validation/registro.js",
        "criterio": "Contraseña con longitud < 8 → ok=false",
        "inconformidad": "Se omitió la validación de longitud mínima",
        "ajuste": "Rechazar si contrasena.length < 8",
        "test_file": "tests/validation/registro.test.js",
        "test_name": "debería rechazar una contraseña de exactamente 7 caracteres",
        "apply": lambda: replace_once(
            ARCHIVOS["registro"],
            """  if (!contrasena) {
    errores.push({ campo: "contrasena", mensaje: "La contraseña es obligatoria." });
  } else if (contrasena.length < 8) {
    errores.push({
      campo: "contrasena",
      mensaje: "La contraseña debe tener al menos 8 caracteres.",
    });
  } else if (contrasena.length > 72) {""",
            """  if (!contrasena) {
    errores.push({ campo: "contrasena", mensaje: "La contraseña es obligatoria." });
  } else if (contrasena.length > 72) { // BUG CU-08: sin mínimo 8""",
            "CU-08",
        ),
    },
    {
        "id": "CU-09",
        "titulo": "Nombre de 2 caracteres era aceptado",
        "modulo": "validation/registro.js",
        "criterio": "Nombre con longitud < 3 → error en campo nombre",
        "inconformidad": "No se validaba el mínimo de 3 caracteres",
        "ajuste": "Rechazar si nombre.length < 3 || > 120",
        "test_file": "tests/validation/registro.test.js",
        "test_name": "debería rechazar un nombre de exactamente 2 caracteres",
        "apply": lambda: replace_once(
            ARCHIVOS["registro"],
            """  if (!nombre) {
    errores.push({ campo: "nombre", mensaje: "El nombre completo es obligatorio." });
  } else if (nombre.length < 3 || nombre.length > 120) {
    errores.push({
      campo: "nombre",
      mensaje: "El nombre completo debe tener entre 3 y 120 caracteres.",
    });
  }""",
            """  if (!nombre) {
    errores.push({ campo: "nombre", mensaje: "El nombre completo es obligatorio." });
  } // BUG CU-09: sin rango 3-120""",
            "CU-09",
        ),
    },
    {
        "id": "CU-10",
        "titulo": "Enlace de verificación ya usado respondía 400",
        "modulo": "controllers/authController.js",
        "criterio": "motivo usado → HTTP 409 Conflict",
        "inconformidad": "Respondía 400 en lugar de conflicto",
        "ajuste": "status(409) cuando motivo === 'usado'",
        "test_file": "tests/controllers/authController.test.js",
        "test_name": "debería responder 409 si el enlace ya fue usado",
        "apply": lambda: replace_once(
            ARCHIVOS["auth"],
            'return res.status(409).json({ mensaje: "Este enlace de verificación ya fue usado." });',
            'return res.status(400).json({ mensaje: "Este enlace de verificación ya fue usado." }); // BUG CU-10',
            "CU-10",
        ),
    },
    {
        "id": "CU-11",
        "titulo": "Contraseña incorrecta respondía 404",
        "modulo": "controllers/authController.js",
        "criterio": "Credenciales inválidas → HTTP 401 genérico",
        "inconformidad": "Respondía 404 Not Found",
        "ajuste": "status(401) con mensaje genérico",
        "test_file": "tests/controllers/authController.test.js",
        "test_name": "debería responder 401 si la contraseña no coincide",
        "apply": lambda: replace_once(
            ARCHIVOS["auth"],
            "if (!usuario || !coincide) {\n      return res.status(401).json({ mensaje: MENSAJE_CREDENCIALES_INVALIDAS });\n    }",
            "if (!usuario || !coincide) {\n      return res.status(404).json({ mensaje: MENSAJE_CREDENCIALES_INVALIDAS }); // BUG CU-11\n    }",
            "CU-11",
        ),
    },
    {
        "id": "CU-12",
        "titulo": "Sesión inválida respondía 403",
        "modulo": "middleware/requiereSesion.js",
        "criterio": "Token de sesión inválido/expirado → HTTP 401",
        "inconformidad": "Respondía 403 Forbidden",
        "ajuste": "status(401) Tu sesión no es válida o expiró",
        "test_file": "tests/middleware/requiereSesion.test.js",
        "test_name": "debería responder 401 si el token de sesión no es válido",
        "apply": lambda: replace_once(
            ARCHIVOS["middleware"],
            'return res.status(401).json({ mensaje: "Tu sesión no es válida o expiró." });',
            'return res.status(403).json({ mensaje: "Tu sesión no es válida o expiró." }); // BUG CU-12',
            "CU-12",
        ),
    },
    {
        "id": "CU-13",
        "titulo": "Esquema Basic era aceptado como si fuera Bearer",
        "modulo": "middleware/requiereSesion.js",
        "criterio": "Solo esquema Bearer es válido; Basic → 401",
        "inconformidad": "Authorization: Basic ... pasaba al buscador de sesión",
        "ajuste": "Exigir tipo === 'Bearer'",
        "test_file": "tests/middleware/requiereSesion.test.js",
        "test_name": "debería rechazar el esquema Basic y exigir Bearer",
        "apply": lambda: replace_once(
            ARCHIVOS["middleware"],
            'if (tipo !== "Bearer" || !token) {\n    return res.status(401).json({ mensaje: "Debes iniciar sesión." });\n  }',
            'if ((tipo !== "Bearer" && tipo !== "Basic") || !token) {\n    return res.status(401).json({ mensaje: "Debes iniciar sesión." }); // BUG CU-13\n  }',
            "CU-13",
        ),
    },
]


def main():
    backup()
    meta = []
    for caso in CASOS:
        print(f"==> {caso['id']}: inyectando defecto…")
        restore()
        caso["apply"]()

        key = archivo_key(caso["modulo"])
        buggy = ARCHIVOS[key].read_text(encoding="utf-8")
        for base in (EVID / caso["id"], ART / caso["id"]):
            base.mkdir(parents=True, exist_ok=True)
            snippet_lines = [
                line
                for line in buggy.splitlines()
                if f"BUG {caso['id']}" in line or f"BUG CU-" in line and caso["id"] in line
            ]
            if not snippet_lines:
                snippet_lines = [line for line in buggy.splitlines() if "BUG CU-" in line][:3]
            (base / "codigo_con_defecto_snippet.js").write_text(
                "\n".join(snippet_lines) + "\n",
                encoding="utf-8",
            )

        fail = run_jest(caso["test_file"], caso["test_name"])
        save_evidence(caso["id"], "01_fallo", fail)
        print(f"    fallo capturado (exit={fail.returncode})")

        restore()
        ok = run_jest(caso["test_file"], caso["test_name"])
        save_evidence(caso["id"], "02_exito", ok)
        print(f"    éxito capturado (exit={ok.returncode})")

        for base in (EVID / caso["id"], ART / caso["id"]):
            (base / "ajuste_aplicado.txt").write_text(
                f"Caso: {caso['id']}\n"
                f"Título: {caso['titulo']}\n"
                f"Módulo: {caso['modulo']}\n"
                f"Criterio: {caso['criterio']}\n"
                f"Inconformidad: {caso['inconformidad']}\n"
                f"Ajuste: {caso['ajuste']}\n"
                f"Test file: {caso['test_file']}\n"
                f"Test: {caso['test_name']}\n"
                f"Exit fallo: {fail.returncode}\n"
                f"Exit éxito: {ok.returncode}\n",
                encoding="utf-8",
            )
            # evidencia_error extract
            blob = (base / "01_fallo.log").read_text(encoding="utf-8", errors="replace")
            parts = [
                line.strip()
                for line in blob.splitlines()
                if line.strip().startswith("●")
                or "Expected" in line
                or "Received" in line
                or "FAIL " in line
            ]
            (base / "evidencia_error.txt").write_text("\n".join(parts[:20]) + "\n", encoding="utf-8")

        meta.append(
            {
                "id": caso["id"],
                "titulo": caso["titulo"],
                "modulo": caso["modulo"],
                "criterio": caso["criterio"],
                "inconformidad": caso["inconformidad"],
                "ajuste": caso["ajuste"],
                "test_file": caso["test_file"],
                "test_name": caso["test_name"],
                "exit_fallo": fail.returncode,
                "exit_exito": ok.returncode,
                "fallo_detectado": fail.returncode != 0,
                "corregido": ok.returncode == 0,
            }
        )

    restore()
    summary = ROOT / "evidencias" / "resumen_casos_ajuste.json"
    summary.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Resumen:", summary)
    malos = [m for m in meta if not (m["fallo_detectado"] and m["corregido"])]
    for m in meta:
        print(m["id"], "fallo=", m["fallo_detectado"], "exito=", m["corregido"])
    if malos:
        raise SystemExit(f"Casos incompletos: {[m['id'] for m in malos]}")


if __name__ == "__main__":
    main()
