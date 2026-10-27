#!/usr/bin/env python3
"""Aplica 7 defectos controlados, captura fallos de Jest y evidencia de corrección."""

from __future__ import annotations

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
    cmd = [
        "npm",
        "test",
        "--",
        "--runInBand",
        test_path_pattern,
    ]
    if test_name_pattern:
        cmd.extend(["-t", test_name_pattern])
    return subprocess.run(
        cmd,
        cwd=BACKEND,
        capture_output=True,
        text=True,
        env={**dict(**{k: v for k, v in __import__("os").environ.items()}), "NODE_OPTIONS": "--experimental-vm-modules"},
    )


def save_evidence(case_id: str, stage: str, result: subprocess.CompletedProcess):
    for base in (EVID / case_id, ART / case_id):
        base.mkdir(parents=True, exist_ok=True)
        out = base / f"{stage}.log"
        content = []
        content.append(f"# Caso {case_id} — etapa: {stage}")
        content.append(f"# exit_code={result.returncode}")
        content.append("")
        content.append("=== STDOUT ===")
        content.append(result.stdout)
        content.append("=== STDERR ===")
        content.append(result.stderr)
        out.write_text("\n".join(content), encoding="utf-8")

        # Resumen corto con Expected/Received si existe
        resumen = base / f"{stage}_resumen.txt"
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
        resumen.write_text("\n".join(dict.fromkeys(lines)) or blob[-2000:], encoding="utf-8")


CASOS = [
    {
        "id": "CU-01",
        "titulo": "Regex de correo institucional demasiado permisiva",
        "modulo": "validation/registro.js",
        "inconformidad": "Aceptaba correos como ana@unicauca.edu.co.evil.com",
        "ajuste": "Anclar la regex a ^...@unicauca\\.edu\\.co$",
        "test_file": "tests/validation/registro.test.js",
        "test_name": "debería rechazar un correo que solo contiene unicauca.edu.co como subcadena",
        "apply": lambda: replace_once(
            ARCHIVOS["registro"],
            "const CORREO_INSTITUCIONAL = /^[^\\s@]+@unicauca\\.edu\\.co$/;",
            "const CORREO_INSTITUCIONAL = /unicauca\\.edu\\.co/i; // BUG CU-01: sin anclas",
            "CU-01",
        ),
    },
    {
        "id": "CU-02",
        "titulo": "Registro duplicado respondía 400 en lugar de 409",
        "modulo": "controllers/authController.js",
        "inconformidad": "Conflicto de correo existente devolvía Bad Request",
        "ajuste": "Usar status 409 Conflict cuando el correo ya existe",
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
        "inconformidad": "Se confundía con credenciales inválidas (401) en vez de prohibido (403)",
        "ajuste": "Devolver 403 con codigo EMAIL_NOT_VERIFIED",
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
        "inconformidad": "Falta de autenticación se reportaba como error de validación",
        "ajuste": "Responder 401 Unauthorized cuando no hay Bearer token",
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
        "inconformidad": "Se guardaba el número local sin prefijo internacional",
        "ajuste": "Prefijar +57 tras validar celular colombiano de 10 dígitos",
        "test_file": "tests/validation/registro.test.js",
        "test_name": "debería normalizar WhatsApp con prefijo 57 a formato \\+57",
        "apply": lambda: replace_once(
            ARCHIVOS["registro"],
            "return `+57${local}`;",
            "return local; // BUG CU-05: sin prefijo +57",
            "CU-05",
        ),
    },
    {
        "id": "CU-06",
        "titulo": "Enlace de verificación expirado respondía 404",
        "modulo": "controllers/authController.js",
        "inconformidad": "Token vencido se trataba como recurso inexistente",
        "ajuste": "Responder 400 con mensaje de expiración",
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
        "inconformidad": "Campos obligatorios vacíos se interpretaban como credenciales incorrectas",
        "ajuste": "Validar presencia y responder 400 Bad Request",
        "test_file": "tests/controllers/authController.test.js",
        "test_name": "debería responder 400 si faltan correo o contraseña",
        "apply": lambda: replace_once(
            ARCHIVOS["auth"],
            'return res.status(400).json({\n      mensaje: "Ingresa tu correo institucional y tu contraseña.",\n    });',
            'return res.status(401).json({\n      mensaje: "Ingresa tu correo institucional y tu contraseña.",\n    }); // BUG CU-07',
            "CU-07",
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
        # Guardar diff del defecto
        for base in (EVID / caso["id"], ART / caso["id"]):
            base.mkdir(parents=True, exist_ok=True)
            buggy = ARCHIVOS[
                "registro" if "registro" in caso["modulo"] else
                "middleware" if "middleware" in caso["modulo"] else
                "auth"
            ].read_text(encoding="utf-8")
            (base / "codigo_con_defecto_snippet.js").write_text(
                "\n".join(
                    line for line in buggy.splitlines() if "BUG " + caso["id"] in line or "BUG CU-" in line or (
                        caso["id"] == "CU-01" and "CORREO_INSTITUCIONAL" in line
                    ) or (caso["id"] == "CU-05" and "return local" in line)
                ),
                encoding="utf-8",
            )

        fail = run_jest(caso["test_file"], caso["test_name"])
        save_evidence(caso["id"], "01_fallo", fail)
        print(f"    fallo capturado (exit={fail.returncode})")

        print(f"    corrigiendo…")
        restore()
        ok = run_jest(caso["test_file"], caso["test_name"])
        save_evidence(caso["id"], "02_exito", ok)
        print(f"    éxito capturado (exit={ok.returncode})")

        # Diff resumido corregido
        for base in (EVID / caso["id"], ART / caso["id"]):
            (base / "ajuste_aplicado.txt").write_text(
                f"Caso: {caso['id']}\n"
                f"Título: {caso['titulo']}\n"
                f"Módulo: {caso['modulo']}\n"
                f"Inconformidad: {caso['inconformidad']}\n"
                f"Ajuste: {caso['ajuste']}\n"
                f"Test: {caso['test_name']}\n"
                f"Exit fallo: {fail.returncode}\n"
                f"Exit éxito: {ok.returncode}\n",
                encoding="utf-8",
            )

        meta.append(
            {
                **caso,
                "exit_fallo": fail.returncode,
                "exit_exito": ok.returncode,
                "fallo_ok": fail.returncode != 0,
                "exito_ok": ok.returncode == 0,
            }
        )

    restore()
    # Resumen global
    summary = ROOT / "evidencias" / "resumen_casos_ajuste.json"
    import json

    serializable = [
        {
            "id": m["id"],
            "titulo": m["titulo"],
            "modulo": m["modulo"],
            "inconformidad": m["inconformidad"],
            "ajuste": m["ajuste"],
            "test_file": m["test_file"],
            "test_name": m["test_name"],
            "exit_fallo": m["exit_fallo"],
            "exit_exito": m["exit_exito"],
            "fallo_detectado": m["fallo_ok"],
            "corregido": m["exito_ok"],
        }
        for m in meta
    ]
    summary.write_text(json.dumps(serializable, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Resumen:", summary)
    for m in meta:
        print(m["id"], "fallo=", m["fallo_ok"], "exito=", m["exito_ok"])


if __name__ == "__main__":
    main()
