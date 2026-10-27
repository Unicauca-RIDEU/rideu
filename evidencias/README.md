# Evidencias de pruebas unitarias — RideU

## Entregable principal

- **Excel:** [`Pruebas_Unitarias_RideU.xlsx`](./Pruebas_Unitarias_RideU.xlsx)
  - Hoja *Inventario de pruebas*: qué se probó
  - Hoja *Casos de ajuste (7)*: inconformidad, error y resolución
  - Hoja *Cobertura*: % por archivo (umbral ≥ 70% en lógica de negocio)
  - Hoja *Detalle evidencias*: extractos de Jest (fallo → éxito)

## Casos de ajuste

Cada carpeta `casos-ajuste/CU-0X/` contiene:

| Archivo | Contenido |
|---------|-----------|
| `01_fallo.log` | Salida Jest con el defecto (test en rojo) |
| `01_fallo_resumen.txt` | Expected vs Received |
| `02_exito.log` | Salida Jest tras el ajuste (test en verde) |
| `02_exito_resumen.txt` | Confirmación PASS |
| `ajuste_aplicado.txt` | Descripción del defecto y la corrección |
| `evidencia_error.txt` | Extracto del aserto fallido |

## Cómo reproducir la suite

```bash
cd backend
npm install
npm test
npm run test:coverage
```

Las pruebas viven en `backend/tests/` y usan mocks (sin PostgreSQL ni SMTP reales).
