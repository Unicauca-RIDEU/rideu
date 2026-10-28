# Evidencias de pruebas unitarias — RideU

## Entregable principal

- **Excel:** [`Pruebas_Unitarias_RideU.xlsx`](./Pruebas_Unitarias_RideU.xlsx) — **13 casos de ajuste**
- **Mapa de archivos de test:** [`MAPA_PRUEBAS.md`](./MAPA_PRUEBAS.md)

### Hojas del Excel

| Hoja | Contenido |
|------|-----------|
| Portada | Resumen del entregable |
| Inventario de pruebas | Qué se probó por módulo |
| Casos de ajuste (13) | Criterio, error, ajuste, evidencias |
| Criterios vs pruebas | Trazabilidad criterio ↔ test |
| Detalle evidencias | Extractos Jest fallo/éxito |
| Cobertura | % por archivo |
| Ubicación de tests | Dónde están los archivos |
| Guía de lectura | Cómo presentar |

## Casos de ajuste CU-01 … CU-13

Cada carpeta `casos-ajuste/CU-XX/` contiene:

| Archivo | Contenido |
|---------|-----------|
| `01_fallo.log` | Jest en rojo (con el defecto) |
| `02_exito.log` | Jest en verde (tras el ajuste) |
| `evidencia_error.txt` | Expected vs Received |
| `ajuste_aplicado.txt` | Criterio + inconformidad + corrección |

## Cómo reproducir

```bash
cd backend
npm install
npm test
npm run test:coverage
```

Las pruebas viven en `backend/tests/` y usan mocks (sin PostgreSQL ni SMTP reales).
