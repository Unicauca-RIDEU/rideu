# Documentación — Ride U

Material de gestión, diseño y pruebas del proyecto.

## Plan de sprints

| Sprint | Fechas (2026) | Historias |
| --- | --- | --- |
| Sprint 1 | 9 oct – 22 oct | HU01 Registro con correo institucional · HU02 Inicio de sesión validado |
| Sprint 2 | 23 oct – 5 nov | HU03 Registrar vehículo y licencia · HU06 Buscar trayectos disponibles |
| Sprint 3 | 6 nov – 19 nov | HU04 Publicar trayecto · HU09 Consultar historial de trayectos y reservas |
| Sprint 4 | 20 nov – 3 dic | HU07 Reservar cupo en trayecto · HU10 Contacto WhatsApp para el pasajero · HU11 Contacto WhatsApp para el conductor |
| Sprint 5 | 4 dic – 17 dic | HU05 Editar o cancelar trayecto · HU08 Cancelar reserva |

Dependencias: HU01 → HU02 → HU03 → HU04 → HU05 · HU06 → HU07 → HU08 · HU07 → HU10 y HU11 · HU04 → HU11 · HU05 y HU07 → HU09.

## Documentación por sprint

| Sprint | Contenido |
| --- | --- |
| [Sprint 1](sprint-1/) | Diagramas de componentes del sistema |
| [Sprint 2](sprint-2/) | Alcance (HU03 y HU06), nota sobre HU04 como base técnica, base de datos, API y pruebas unitarias |
| [Sprint 3](sprint-3/) | Alcance (HU04 y HU09), evaluación de HU04, correcciones y mejoras de HU01 a HU04, HU09, pruebas unitarias y funcionales y revisiones independientes |

## Documentos del proyecto

| Carpeta | Contenido | Versión vigente |
| --- | --- | --- |
| [Backlogs](Backlogs/) | Product Backlog y Planning Poker | v1.6 |
| [UserStories](UserStories/) | Historias de usuario y criterios de aceptación (Dado / Cuando / Entonces) | v1.3 |
| [TestCases](TestCases/) | Casos de prueba funcionales, un documento Word y un registro Excel por sprint | Ver la tabla siguiente |
| [RiskManagement](RiskManagement/) | Plan de gestión de riesgos | v1.0 |
| [figma](figma/) | Prototipos de las pantallas | — |

Las versiones anteriores se conservan como historial; la vigente es siempre la de número mayor.

### Casos de prueba funcionales por sprint

| Carpeta | Casos | Versión vigente |
| --- | --- | --- |
| [TestCases/sprint-01](TestCases/sprint-01/) | 20 casos de HU01 y HU02 | v1.1 |
| [TestCases/sprint-02](TestCases/sprint-02/) | 7 casos de HU03 y HU06 | v1.0 |
| [TestCases/sprint-03](TestCases/sprint-03/) | 20 casos de HU01 a HU04 (correcciones y mejoras) y HU09 | v1.0 |
| [TestCases/historico](TestCases/historico/) | Versión 1.1 original, que reunía los sprints 1 y 2 | — |

La trazabilidad de las pruebas unitarias está en [`evidencias/Pruebas_Unitarias_RideU.xlsx`](../evidencias/Pruebas_Unitarias_RideU.xlsx).
