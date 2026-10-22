#!/usr/bin/env python3
"""Generate RideU StarUML .mdj with Diagramas_De_Proceso hierarchy from backlog."""

from __future__ import annotations

import base64
import json
import struct
from pathlib import Path


class IdGen:
    def __init__(self) -> None:
        self.n = 0

    def next(self) -> str:
        self.n += 1
        raw = b"RU" + struct.pack(">Q", self.n) + b"\x00\x00\x00\x00\x00\x00"
        return base64.b64encode(raw[:15]).decode("ascii") + "="


IDS = IdGen()


def ref(eid: str) -> dict:
    return {"$ref": eid}


def make_label(
    parent_id: str,
    text: str,
    *,
    left: int,
    top: int,
    width: int,
    height: int = 13,
) -> dict:
    lid = IDS.next()
    return {
        "_type": "LabelView",
        "_id": lid,
        "_parent": ref(parent_id),
        "visible": True,
        "enabled": True,
        "lineColor": "#000000",
        "fillColor": "#ffffff",
        "fontColor": "#000000",
        "font": "Arial;13;0",
        "parentStyle": True,
        "left": left,
        "top": top,
        "width": width,
        "height": height,
        "text": text,
        "horizontalAlignment": 2,
        "verticalAlignment": 5,
    }


def base_view2(
    vtype: str,
    vid: str,
    parent_id: str,
    model_id: str,
    *,
    left: int,
    top: int,
    width: int,
    height: int,
    fill: str = "#ffffff",
) -> dict:
    return {
        "_type": vtype,
        "_id": vid,
        "_parent": ref(parent_id),
        "model": ref(model_id),
        "subViews": [],
        "visible": True,
        "enabled": True,
        "lineColor": "#000000",
        "fillColor": fill,
        "fontColor": "#000000",
        "font": "Arial;13;0",
        "parentStyle": True,
        "left": left,
        "top": top,
        "width": width,
        "height": height,
    }


def action_view(diagram_id: str, model_id: str, name: str, left: int, top: int) -> dict:
    vid = IDS.next()
    width = max(180, min(340, 12 + len(name) * 7))
    height = 44
    name_label = make_label(vid, name, left=left + 6, top=top + 15, width=width - 12)
    v = base_view2(
        "UMLActionView",
        vid,
        diagram_id,
        model_id,
        left=left,
        top=top,
        width=width,
        height=height,
        fill="#FFFDE7",
    )
    v["nameLabel"] = ref(name_label["_id"])
    v["subViews"] = [name_label]
    v["containerChangeable"] = True
    return v


def initial_view(diagram_id: str, model_id: str, left: int, top: int) -> dict:
    return base_view2(
        "UMLInitialNodeView",
        IDS.next(),
        diagram_id,
        model_id,
        left=left,
        top=top,
        width=18,
        height=18,
        fill="#000000",
    )


def final_view(diagram_id: str, model_id: str, left: int, top: int) -> dict:
    return base_view2(
        "UMLActivityFinalNodeView",
        IDS.next(),
        diagram_id,
        model_id,
        left=left,
        top=top,
        width=22,
        height=22,
        fill="#ffffff",
    )


def decision_view(diagram_id: str, model_id: str, left: int, top: int) -> dict:
    return base_view2(
        "UMLDecisionNodeView",
        IDS.next(),
        diagram_id,
        model_id,
        left=left,
        top=top,
        width=32,
        height=32,
        fill="#ffffff",
    )


def flow_view(
    diagram_id: str,
    flow_id: str,
    head_view_id: str,
    tail_view_id: str,
    label: str | None,
    points: list[int],
) -> dict:
    vid = IDS.next()
    sub: list[dict] = []
    v: dict = {
        "_type": "UMLControlFlowView",
        "_id": vid,
        "_parent": ref(diagram_id),
        "model": ref(flow_id),
        "subViews": sub,
        "visible": True,
        "enabled": True,
        "lineColor": "#000000",
        "fillColor": "#ffffff",
        "fontColor": "#000000",
        "font": "Arial;13;0",
        "parentStyle": True,
        "head": ref(head_view_id),
        "tail": ref(tail_view_id),
        "lineStyle": 1,
        "points": ",".join(str(p) for p in points),
    }
    if label:
        mid_x = (points[0] + points[-2]) // 2
        mid_y = (points[1] + points[-1]) // 2
        lbl = make_label(
            vid,
            label,
            left=mid_x + 6,
            top=mid_y - 14,
            width=max(28, len(label) * 8),
        )
        sub.append(lbl)
        v["nameLabel"] = ref(lbl["_id"])
    return v


def cx(view: dict) -> int:
    return view["left"] + view["width"] // 2


def bottom(view: dict) -> int:
    return view["top"] + view["height"]


def build_activity(parent_id: str, diagram_name: str, documentation: str, steps: dict) -> dict:
    activity_id = IDS.next()
    diagram_id = IDS.next()

    nodes: dict[str, dict] = {}
    views: dict[str, dict] = {}
    owned: list[dict] = []
    owned_views: list[dict] = []

    main_col = 300
    left_col = 40
    right_col = 560
    gap = 78

    # Assign Y for main-lane nodes in declaration order
    y_pos: dict[str, int] = {}
    main_i = 0
    for nd in steps["nodes"]:
        if nd.get("lane", "main") == "main":
            y_pos[nd["id"]] = 36 + main_i * gap
            main_i += 1

    # Side-lane nodes: stack under their align anchor, with offset per sibling
    side_counters: dict[tuple[str, str], int] = {}
    for nd in steps["nodes"]:
        lane = nd.get("lane", "main")
        if lane == "main":
            continue
        align = nd.get("align")
        base_y = y_pos.get(align, 36)
        key = (lane, align or "")
        offset = side_counters.get(key, 0)
        side_counters[key] = offset + 1
        y_pos[nd["id"]] = base_y + offset * gap

    for nd in steps["nodes"]:
        nid = IDS.next()
        kind = nd["kind"]
        key = nd["id"]
        lane = nd.get("lane", "main")
        top = y_pos[key]
        if lane == "main":
            left = main_col
        elif lane == "left":
            left = left_col
        else:
            left = right_col

        if kind == "initial":
            model = {
                "_type": "UMLInitialNode",
                "_id": nid,
                "_parent": ref(activity_id),
                "name": "",
            }
            view = initial_view(diagram_id, nid, left + 100, top + 8)
        elif kind == "final":
            model = {
                "_type": "UMLActivityFinalNode",
                "_id": nid,
                "_parent": ref(activity_id),
                "name": "",
            }
            view = final_view(diagram_id, nid, left + 98, top + 6)
        elif kind == "decision":
            model = {
                "_type": "UMLDecisionNode",
                "_id": nid,
                "_parent": ref(activity_id),
                "name": nd.get("name", ""),
            }
            view = decision_view(diagram_id, nid, left + 94, top + 4)
        elif kind == "action":
            model = {
                "_type": "UMLAction",
                "_id": nid,
                "_parent": ref(activity_id),
                "name": nd["name"],
            }
            view = action_view(diagram_id, nid, nd["name"], left, top)
        else:
            raise ValueError(kind)

        nodes[key] = model
        views[key] = view
        owned.append(model)
        owned_views.append(view)

    for edge in steps["edges"]:
        frm, to = edge[0], edge[1]
        label = edge[2] if len(edge) > 2 else None
        sm, sv = nodes[frm], views[frm]
        tm, tv = nodes[to], views[to]

        fid = IDS.next()
        flow: dict = {
            "_type": "UMLControlFlow",
            "_id": fid,
            "_parent": ref(activity_id),
            "source": ref(sm["_id"]),
            "target": ref(tm["_id"]),
        }
        if label:
            flow["name"] = label
        owned.append(flow)

        sx, sy = cx(sv), bottom(sv)
        tx, ty = cx(tv), tv["top"]
        if abs(sx - tx) > 30:
            points = [sx, sy, tx, sy, tx, ty]
        else:
            points = [sx, sy, tx, ty]

        owned_views.append(
            flow_view(diagram_id, fid, tv["_id"], sv["_id"], label, points)
        )

    diagram = {
        "_type": "UMLActivityDiagram",
        "_id": diagram_id,
        "_parent": ref(activity_id),
        "name": diagram_name,
        "visible": True,
        "defaultDiagram": False,
        "ownedViews": owned_views,
    }
    owned.insert(0, diagram)

    return {
        "_type": "UMLActivity",
        "_id": activity_id,
        "_parent": ref(parent_id),
        "name": diagram_name,
        "documentation": documentation,
        "ownedElements": owned,
    }


PROCESSES: dict[str, dict] = {
    "E1_HU1": {
        "doc": (
            "HU01 — Registro con correo institucional\n"
            "Path: /registro, /registro/verificacion\n"
            "Épica E01: Gestión de identidad y autenticación institucional"
        ),
        "nodes": [
            {"id": "s", "kind": "initial"},
            {"id": "a1", "kind": "action", "name": "Abrir /registro e ingresar datos"},
            {"id": "d1", "kind": "decision", "name": "¿Dominio @unicauca.edu.co?"},
            {
                "id": "rej",
                "kind": "action",
                "name": "Rechazar: solo correo institucional",
                "lane": "left",
                "align": "d1",
            },
            {"id": "a2", "kind": "action", "name": "Crear cuenta «Sin verificar»"},
            {"id": "a3", "kind": "action", "name": "Enviar enlace de verificación"},
            {"id": "a4", "kind": "action", "name": "Usuario abre /registro/verificacion"},
            {"id": "a5", "kind": "action", "name": "Activar cuenta «Verificada»"},
            {"id": "a6", "kind": "action", "name": "Ofrecer ir a /login"},
            {"id": "f1", "kind": "final"},
            {"id": "f2", "kind": "final", "lane": "left", "align": "d1"},
        ],
        "edges": [
            ("s", "a1"),
            ("a1", "d1"),
            ("d1", "rej", "No"),
            ("d1", "a2", "Sí"),
            ("rej", "f2"),
            ("a2", "a3"),
            ("a3", "a4"),
            ("a4", "a5"),
            ("a5", "a6"),
            ("a6", "f1"),
        ],
    },
    "E1_HU2": {
        "doc": (
            "HU02 — Inicio de sesión validado\n"
            "Path: /login\n"
            "Épica E01: Gestión de identidad y autenticación institucional"
        ),
        "nodes": [
            {"id": "s", "kind": "initial"},
            {"id": "a1", "kind": "action", "name": "Abrir /login e ingresar credenciales"},
            {"id": "d1", "kind": "decision", "name": "¿Credenciales correctas?"},
            {
                "id": "err",
                "kind": "action",
                "name": "Mensaje de error genérico",
                "lane": "left",
                "align": "d1",
            },
            {"id": "d2", "kind": "decision", "name": "¿Cuenta verificada?"},
            {
                "id": "nv",
                "kind": "action",
                "name": "Impedir acceso: verificar correo",
                "lane": "right",
                "align": "d2",
            },
            {"id": "ok", "kind": "action", "name": "Acceso al panel principal"},
            {"id": "f1", "kind": "final"},
            {"id": "f2", "kind": "final", "lane": "left", "align": "d1"},
            {"id": "f3", "kind": "final", "lane": "right", "align": "d2"},
        ],
        "edges": [
            ("s", "a1"),
            ("a1", "d1"),
            ("d1", "err", "No"),
            ("d1", "d2", "Sí"),
            ("err", "f2"),
            ("d2", "nv", "No"),
            ("d2", "ok", "Sí"),
            ("nv", "f3"),
            ("ok", "f1"),
        ],
    },
    "E2_HU1": {
        "doc": (
            "HU03 — Registrar vehículo y licencia\n"
            "Path: /perfil/vehiculo\n"
            "Épica E02: Gestión de oferta de trayectos (conductores)"
        ),
        "nodes": [
            {"id": "s", "kind": "initial"},
            {"id": "a1", "kind": "action", "name": "Abrir /perfil/vehiculo"},
            {"id": "a2", "kind": "action", "name": "Ingresar vehículo y licencia"},
            {"id": "d1", "kind": "decision", "name": "¿Campos válidos?"},
            {
                "id": "inv",
                "kind": "action",
                "name": "Señalar campos inválidos",
                "lane": "left",
                "align": "d1",
            },
            {"id": "d2", "kind": "decision", "name": "¿Licencia vigente?"},
            {
                "id": "ven",
                "kind": "action",
                "name": "Rechazar: licencia no vigente",
                "lane": "right",
                "align": "d2",
            },
            {"id": "ok", "kind": "action", "name": "Registrar y marcar «Habilitado»"},
            {"id": "f1", "kind": "final"},
            {"id": "f2", "kind": "final", "lane": "left", "align": "d1"},
            {"id": "f3", "kind": "final", "lane": "right", "align": "d2"},
        ],
        "edges": [
            ("s", "a1"),
            ("a1", "a2"),
            ("a2", "d1"),
            ("d1", "inv", "No"),
            ("d1", "d2", "Sí"),
            ("inv", "f2"),
            ("d2", "ven", "No"),
            ("d2", "ok", "Sí"),
            ("ven", "f3"),
            ("ok", "f1"),
        ],
    },
    "E2_HU2": {
        "doc": (
            "HU04 — Publicar trayecto\n"
            "Path: /trayectos/publicar\n"
            "Épica E02: Gestión de oferta de trayectos (conductores)"
        ),
        "nodes": [
            {"id": "s", "kind": "initial"},
            {"id": "a1", "kind": "action", "name": "Abrir /trayectos/publicar"},
            {"id": "d0", "kind": "decision", "name": "¿Conductor habilitado?"},
            {
                "id": "nh",
                "kind": "action",
                "name": "Dirigir a /perfil/vehiculo",
                "lane": "left",
                "align": "d0",
            },
            {
                "id": "a2",
                "kind": "action",
                "name": "Ingresar origen, sede, fecha, hora, cupos, aporte",
            },
            {"id": "d1", "kind": "decision", "name": "¿Campos y cupos válidos?"},
            {
                "id": "inv",
                "kind": "action",
                "name": "Mostrar validación / capacidad máx.",
                "lane": "right",
                "align": "d1",
            },
            {"id": "ok", "kind": "action", "name": "Crear trayecto disponible"},
            {"id": "f1", "kind": "final"},
            {"id": "f2", "kind": "final", "lane": "left", "align": "d0"},
            {"id": "f3", "kind": "final", "lane": "right", "align": "d1"},
        ],
        "edges": [
            ("s", "a1"),
            ("a1", "d0"),
            ("d0", "nh", "No"),
            ("d0", "a2", "Sí"),
            ("nh", "f2"),
            ("a2", "d1"),
            ("d1", "inv", "No"),
            ("d1", "ok", "Sí"),
            ("inv", "f3"),
            ("ok", "f1"),
        ],
    },
    "E2_HU3": {
        "doc": (
            "HU05 — Editar o cancelar trayecto\n"
            "Path: /trayectos/editar\n"
            "Épica E02: Gestión de oferta de trayectos (conductores)"
        ),
        "nodes": [
            {"id": "s", "kind": "initial"},
            {"id": "a1", "kind": "action", "name": "Abrir /trayectos/editar"},
            {"id": "d1", "kind": "decision", "name": "¿Editar o cancelar?"},
            {
                "id": "ed",
                "kind": "action",
                "name": "Modificar fecha/hora/cupos",
                "lane": "left",
                "align": "d1",
            },
            {
                "id": "sv",
                "kind": "action",
                "name": "Guardar cambios visibles",
                "lane": "left",
                "align": "d1",
            },
            {"id": "d2", "kind": "decision", "name": "¿Hay reservas confirmadas?"},
            {
                "id": "cf",
                "kind": "action",
                "name": "Confirmar pasajeros afectados",
                "lane": "right",
                "align": "d2",
            },
            {"id": "can", "kind": "action", "name": "Cancelar trayecto y reservas"},
            {"id": "nt", "kind": "action", "name": "Notificar pasajeros afectados"},
            {"id": "f1", "kind": "final"},
            {"id": "f2", "kind": "final", "lane": "left", "align": "d1"},
        ],
        "edges": [
            ("s", "a1"),
            ("a1", "d1"),
            ("d1", "ed", "Editar"),
            ("d1", "d2", "Cancelar"),
            ("ed", "sv"),
            ("sv", "f2"),
            ("d2", "can", "No"),
            ("d2", "cf", "Sí"),
            ("cf", "can"),
            ("can", "nt"),
            ("nt", "f1"),
        ],
    },
    "E3_HU1": {
        "doc": (
            "HU06 — Buscar trayectos disponibles\n"
            "Path: /trayectos/buscar\n"
            "Épica E03: Búsqueda y demanda de trayectos (pasajeros)"
        ),
        "nodes": [
            {"id": "s", "kind": "initial"},
            {"id": "a1", "kind": "action", "name": "Abrir /trayectos/buscar"},
            {"id": "a2", "kind": "action", "name": "Filtrar por sede, fecha y hora"},
            {"id": "a3", "kind": "action", "name": "Excluir trayectos sin cupos"},
            {"id": "d1", "kind": "decision", "name": "¿Hay resultados?"},
            {
                "id": "empty",
                "kind": "action",
                "name": "«No hay resultados disponibles»",
                "lane": "left",
                "align": "d1",
            },
            {"id": "ok", "kind": "action", "name": "Listar trayectos ordenados por hora"},
            {"id": "f1", "kind": "final"},
            {"id": "f2", "kind": "final", "lane": "left", "align": "d1"},
        ],
        "edges": [
            ("s", "a1"),
            ("a1", "a2"),
            ("a2", "a3"),
            ("a3", "d1"),
            ("d1", "empty", "No"),
            ("d1", "ok", "Sí"),
            ("empty", "f2"),
            ("ok", "f1"),
        ],
    },
    "E4_HU1": {
        "doc": (
            "HU07 — Reservar cupo en trayecto\n"
            "Path: /trayectos/reservar\n"
            "Épica E04: Gestión de reservas y disponibilidad en tiempo real"
        ),
        "nodes": [
            {"id": "s", "kind": "initial"},
            {
                "id": "a1",
                "kind": "action",
                "name": "Seleccionar trayecto y abrir /trayectos/reservar",
            },
            {"id": "a2", "kind": "action", "name": "Confirmar reserva"},
            {"id": "d1", "kind": "decision", "name": "¿Cupo disponible (concurrencia)?"},
            {
                "id": "agot",
                "kind": "action",
                "name": "«Cupos agotados» / volver a buscar",
                "lane": "left",
                "align": "d1",
            },
            {"id": "ok", "kind": "action", "name": "Confirmar, descontar cupo y actualizar"},
            {"id": "f1", "kind": "final"},
            {"id": "f2", "kind": "final", "lane": "left", "align": "d1"},
        ],
        "edges": [
            ("s", "a1"),
            ("a1", "a2"),
            ("a2", "d1"),
            ("d1", "agot", "No"),
            ("d1", "ok", "Sí"),
            ("agot", "f2"),
            ("ok", "f1"),
        ],
    },
    "E4_HU2": {
        "doc": (
            "HU08 — Cancelar reserva\n"
            "Path: /reservas/cancelar\n"
            "Épica E04: Gestión de reservas y disponibilidad en tiempo real"
        ),
        "nodes": [
            {"id": "s", "kind": "initial"},
            {"id": "a1", "kind": "action", "name": "Abrir /reservas/cancelar"},
            {"id": "a2", "kind": "action", "name": "Seleccionar reserva y confirmar"},
            {"id": "d1", "kind": "decision", "name": "¿Trayecto ya inició?"},
            {
                "id": "bloq",
                "kind": "action",
                "name": "Impedir cancelación",
                "lane": "left",
                "align": "d1",
            },
            {"id": "ok", "kind": "action", "name": "Estado «Cancelada» y liberar cupo"},
            {"id": "nt", "kind": "action", "name": "Notificar al conductor"},
            {"id": "f1", "kind": "final"},
            {"id": "f2", "kind": "final", "lane": "left", "align": "d1"},
        ],
        "edges": [
            ("s", "a1"),
            ("a1", "a2"),
            ("a2", "d1"),
            ("d1", "bloq", "Sí"),
            ("d1", "ok", "No"),
            ("bloq", "f2"),
            ("ok", "nt"),
            ("nt", "f1"),
        ],
    },
    "E4_HU3": {
        "doc": (
            "HU09 — Consultar historial de trayectos y reservas\n"
            "Path: /historial\n"
            "Épica E04: Gestión de reservas y disponibilidad en tiempo real"
        ),
        "nodes": [
            {"id": "s", "kind": "initial"},
            {"id": "a1", "kind": "action", "name": "Acceder a /historial"},
            {"id": "d1", "kind": "decision", "name": "¿Hay actividad registrada?"},
            {
                "id": "empty",
                "kind": "action",
                "name": "Mensaje: aún no hay registros",
                "lane": "left",
                "align": "d1",
            },
            {"id": "ok", "kind": "action", "name": "Listar actividad con estado"},
            {"id": "f1", "kind": "final"},
            {"id": "f2", "kind": "final", "lane": "left", "align": "d1"},
        ],
        "edges": [
            ("s", "a1"),
            ("a1", "d1"),
            ("d1", "empty", "No"),
            ("d1", "ok", "Sí"),
            ("empty", "f2"),
            ("ok", "f1"),
        ],
    },
    "E5_HU1": {
        "doc": (
            "HU10 — Contacto WhatsApp para el pasajero\n"
            "Path: /reservas/contacto-conductor\n"
            "Épica E05: Coordinación externa vía WhatsApp"
        ),
        "nodes": [
            {"id": "s", "kind": "initial"},
            {
                "id": "a1",
                "kind": "action",
                "name": "Abrir detalle /reservas/contacto-conductor",
            },
            {"id": "a2", "kind": "action", "name": "Clic en contacto del conductor"},
            {"id": "d1", "kind": "decision", "name": "¿WhatsApp válido?"},
            {
                "id": "na",
                "kind": "action",
                "name": "Contacto no disponible",
                "lane": "left",
                "align": "d1",
            },
            {
                "id": "ok",
                "kind": "action",
                "name": "Abrir enlace wa.me (sin chat interno)",
            },
            {"id": "f1", "kind": "final"},
            {"id": "f2", "kind": "final", "lane": "left", "align": "d1"},
        ],
        "edges": [
            ("s", "a1"),
            ("a1", "a2"),
            ("a2", "d1"),
            ("d1", "na", "No"),
            ("d1", "ok", "Sí"),
            ("na", "f2"),
            ("ok", "f1"),
        ],
    },
    "E5_HU2": {
        "doc": (
            "HU11 — Contacto WhatsApp para el conductor\n"
            "Path: /trayectos/pasajeros/contacto\n"
            "Épica E05: Coordinación externa vía WhatsApp"
        ),
        "nodes": [
            {"id": "s", "kind": "initial"},
            {"id": "a1", "kind": "action", "name": "Abrir /trayectos/pasajeros/contacto"},
            {
                "id": "a2",
                "kind": "action",
                "name": "Listar pasajeros con reserva confirmada",
            },
            {
                "id": "a3",
                "kind": "action",
                "name": "Mostrar wa.me por pasajero confirmado",
            },
            {
                "id": "a4",
                "kind": "action",
                "name": "Ocultar enlace si canceló reserva",
            },
            {"id": "f1", "kind": "final"},
        ],
        "edges": [
            ("s", "a1"),
            ("a1", "a2"),
            ("a2", "a3"),
            ("a3", "a4"),
            ("a4", "f1"),
        ],
    },
}


EPICS = [
    {
        "name": "E1_Identidad_Autenticacion",
        "title": "E01 — Gestión de identidad y autenticación institucional",
        "hus": ["E1_HU1", "E1_HU2"],
    },
    {
        "name": "E2_Oferta_Trayectos",
        "title": "E02 — Gestión de oferta de trayectos (conductores)",
        "hus": ["E2_HU1", "E2_HU2", "E2_HU3"],
    },
    {
        "name": "E3_Busqueda_Demanda",
        "title": "E03 — Búsqueda y demanda de trayectos (pasajeros)",
        "hus": ["E3_HU1"],
    },
    {
        "name": "E4_Reservas_Disponibilidad",
        "title": "E04 — Gestión de reservas y disponibilidad en tiempo real",
        "hus": ["E4_HU1", "E4_HU2", "E4_HU3"],
    },
    {
        "name": "E5_Coordinacion_WhatsApp",
        "title": "E05 — Coordinación externa vía WhatsApp",
        "hus": ["E5_HU1", "E5_HU2"],
    },
]


def build_project() -> dict:
    project_id = IDS.next()
    model_id = IDS.next()
    epic_packages: list[dict] = []

    for epic in EPICS:
        pkg_id = IDS.next()
        activities = [
            build_activity(
                pkg_id,
                hu_key,
                PROCESSES[hu_key]["doc"],
                PROCESSES[hu_key],
            )
            for hu_key in epic["hus"]
        ]
        epic_packages.append(
            {
                "_type": "UMLPackage",
                "_id": pkg_id,
                "_parent": ref(model_id),
                "name": epic["name"],
                "documentation": epic["title"],
                "ownedElements": activities,
            }
        )

    return {
        "_type": "Project",
        "_id": project_id,
        "name": "RideU",
        "ownedElements": [
            {
                "_type": "UMLPackage",
                "_id": model_id,
                "_parent": ref(project_id),
                "name": "Diagramas_De_Proceso",
                "documentation": (
                    "Diagramas de proceso de RideU organizados por épicas e historias "
                    "de usuario del BackLog de Producto."
                ),
                "ownedElements": epic_packages,
            }
        ],
    }


def validate(project: dict) -> None:
    ids: set[str] = set()
    refs_found: list[str] = []

    def walk(obj):
        if isinstance(obj, dict):
            if "_id" in obj:
                assert obj["_id"] not in ids, f"duplicate id {obj['_id']}"
                ids.add(obj["_id"])
            if "$ref" in obj and len(obj) == 1:
                refs_found.append(obj["$ref"])
            for v in obj.values():
                walk(v)
        elif isinstance(obj, list):
            for v in obj:
                walk(v)

    walk(project)
    missing = [r for r in refs_found if r not in ids]
    assert not missing, f"missing refs: {missing[:10]}"

    model = project["ownedElements"][0]
    assert model["name"] == "Diagramas_De_Proceso"
    assert len(model["ownedElements"]) == 5
    hu_count = sum(len(p["ownedElements"]) for p in model["ownedElements"])
    assert hu_count == 11, hu_count


def main() -> None:
    out = Path(__file__).resolve().parent / "RideU_Diagramas_De_Proceso.mdj"
    project = build_project()
    validate(project)
    out.write_text(json.dumps(project, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {out} ({out.stat().st_size} bytes)")
    model = project["ownedElements"][0]
    print(f"Project: {project['name']}")
    print(f"  {model['name']}")
    for pkg in model["ownedElements"]:
        print(f"    {pkg['name']}")
        for act in pkg["ownedElements"]:
            n_actions = sum(1 for e in act["ownedElements"] if e["_type"] == "UMLAction")
            print(f"      {act['name']}  [actions={n_actions}]")


if __name__ == "__main__":
    main()
