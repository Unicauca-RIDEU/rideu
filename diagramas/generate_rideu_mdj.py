#!/usr/bin/env python3
"""Generate RideU StarUML .mdj statechart diagrams from the product backlog."""

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


def edge_label(
    parent_id: str,
    model_id: str,
    *,
    text: str | None,
    visible: bool,
    left: int,
    top: int,
    width: int = 10,
    height: int = 13,
    alpha: float = 1.5708,
    distance: float = 15,
) -> dict:
    lab: dict = {
        "_type": "EdgeLabelView",
        "_id": IDS.next(),
        "_parent": ref(parent_id),
        "model": ref(model_id),
        "visible": visible,
        "font": "Arial;13;0",
        "left": left,
        "top": top,
        "width": width if text else 0,
        "height": height,
        "alpha": alpha,
        "distance": distance,
        "hostEdge": ref(parent_id),
        "edgePosition": 1,
    }
    if text:
        lab["text"] = text
        lab["width"] = max(width, len(text) * 7)
    return lab


def node_label(parent_id: str, model_id: str) -> dict:
    return {
        "_type": "NodeLabelView",
        "_id": IDS.next(),
        "_parent": ref(parent_id),
        "model": ref(model_id),
        "visible": False,
        "font": "Arial;13;0",
        "height": 13,
        "alpha": 2.356194490192345,
        "distance": 20,
    }


def make_state_view(diagram_id: str, model_id: str, name: str, left: int, top: int) -> dict:
    vid = IDS.next()
    width = max(140, min(280, 20 + len(name) * 8))
    height = 40

    stereo = {
        "_type": "LabelView",
        "_id": IDS.next(),
        "_parent": None,  # filled below
        "visible": False,
        "font": "Arial;13;0",
        "top": -16,
        "height": 13,
    }
    name_lab = {
        "_type": "LabelView",
        "_id": IDS.next(),
        "_parent": None,
        "font": "Arial;13;1",
        "left": left + 8,
        "top": top + 12,
        "width": width - 16,
        "height": 13,
        "text": name,
    }
    ns_lab = {
        "_type": "LabelView",
        "_id": IDS.next(),
        "_parent": None,
        "visible": False,
        "font": "Arial;13;0",
        "top": -16,
        "height": 13,
        "text": "(from )",
    }
    prop_lab = {
        "_type": "LabelView",
        "_id": IDS.next(),
        "_parent": None,
        "visible": False,
        "font": "Arial;13;0",
        "top": -16,
        "height": 13,
        "horizontalAlignment": 1,
    }

    nc_id = IDS.next()
    for lab in (stereo, name_lab, ns_lab, prop_lab):
        lab["_parent"] = ref(nc_id)

    name_comp = {
        "_type": "UMLNameCompartmentView",
        "_id": nc_id,
        "_parent": ref(vid),
        "model": ref(model_id),
        "subViews": [stereo, name_lab, ns_lab, prop_lab],
        "font": "Arial;13;0",
        "left": left,
        "top": top,
        "width": width,
        "height": 25,
        "stereotypeLabel": ref(stereo["_id"]),
        "nameLabel": ref(name_lab["_id"]),
        "namespaceLabel": ref(ns_lab["_id"]),
        "propertyLabel": ref(prop_lab["_id"]),
    }

    ia = {
        "_type": "UMLInternalActivityCompartmentView",
        "_id": IDS.next(),
        "_parent": ref(vid),
        "model": ref(model_id),
        "visible": False,
        "font": "Arial;13;0",
        "top": -8,
        "width": 10,
        "height": 10,
    }
    it = {
        "_type": "UMLInternalTransitionCompartmentView",
        "_id": IDS.next(),
        "_parent": ref(vid),
        "model": ref(model_id),
        "visible": False,
        "font": "Arial;13;0",
        "top": -8,
        "width": 10,
        "height": 10,
    }
    dec = {
        "_type": "UMLDecompositionCompartmentView",
        "_id": IDS.next(),
        "_parent": ref(vid),
        "model": ref(model_id),
        "visible": False,
        "font": "Arial;13;0",
        "top": -8,
        "width": 10,
        "height": 10,
        "subViews": [],
    }

    return {
        "_type": "UMLStateView",
        "_id": vid,
        "_parent": ref(diagram_id),
        "model": ref(model_id),
        "subViews": [name_comp, ia, it, dec],
        "font": "Arial;13;0",
        "fillColor": "#E3F2FD",
        "lineColor": "#1565C0",
        "containerChangeable": True,
        "left": left,
        "top": top,
        "width": width,
        "height": height,
        "nameCompartment": ref(nc_id),
        "internalActivityCompartment": ref(ia["_id"]),
        "internalTransitionCompartment": ref(it["_id"]),
        "decompositionCompartment": ref(dec["_id"]),
    }


def make_pseudostate_view(diagram_id: str, model_id: str, left: int, top: int) -> dict:
    vid = IDS.next()
    labels = [node_label(vid, model_id) for _ in range(3)]
    return {
        "_type": "UMLPseudostateView",
        "_id": vid,
        "_parent": ref(diagram_id),
        "model": ref(model_id),
        "subViews": labels,
        "font": "Arial;13;0",
        "fillColor": "#000000",
        "containerChangeable": True,
        "left": left,
        "top": top,
        "width": 20,
        "height": 20,
        "nameLabel": ref(labels[0]["_id"]),
        "stereotypeLabel": ref(labels[1]["_id"]),
        "propertyLabel": ref(labels[2]["_id"]),
    }


def make_final_view(diagram_id: str, model_id: str, left: int, top: int) -> dict:
    return {
        "_type": "UMLFinalStateView",
        "_id": IDS.next(),
        "_parent": ref(diagram_id),
        "model": ref(model_id),
        "subViews": [],
        "font": "Arial;13;0",
        "containerChangeable": True,
        "left": left,
        "top": top,
        "width": 26,
        "height": 26,
    }


def make_choice_view(diagram_id: str, model_id: str, left: int, top: int) -> dict:
    vid = IDS.next()
    labels = [node_label(vid, model_id) for _ in range(3)]
    return {
        "_type": "UMLPseudostateView",
        "_id": vid,
        "_parent": ref(diagram_id),
        "model": ref(model_id),
        "subViews": labels,
        "font": "Arial;13;0",
        "fillColor": "#ffffff",
        "containerChangeable": True,
        "left": left,
        "top": top,
        "width": 24,
        "height": 24,
        "nameLabel": ref(labels[0]["_id"]),
        "stereotypeLabel": ref(labels[1]["_id"]),
        "propertyLabel": ref(labels[2]["_id"]),
    }


def cx(view: dict) -> int:
    return view["left"] + view["width"] // 2


def mid_y(view: dict) -> int:
    return view["top"] + view["height"] // 2


def bottom(view: dict) -> int:
    return view["top"] + view["height"]


def make_transition_view(
    diagram_id: str,
    transition_id: str,
    head_view: dict,
    tail_view: dict,
    label: str,
    points: list[int],
) -> dict:
    vid = IDS.next()
    mid_x = (points[0] + points[-2]) // 2
    mid_y_ = (points[1] + points[-1]) // 2
    name_lab = edge_label(
        vid,
        transition_id,
        text=label,
        visible=True,
        left=mid_x + 4,
        top=mid_y_ - 16,
        width=max(40, len(label) * 7),
    )
    stereo = edge_label(
        vid, transition_id, text=None, visible=False, left=mid_x, top=mid_y_, width=0
    )
    prop = edge_label(
        vid, transition_id, text=None, visible=False, left=mid_x, top=mid_y_, width=0
    )
    return {
        "_type": "UMLTransitionView",
        "_id": vid,
        "_parent": ref(diagram_id),
        "model": ref(transition_id),
        "subViews": [name_lab, stereo, prop],
        "font": "Arial;13;0",
        "lineColor": "#000000",
        "head": ref(head_view["_id"]),
        "tail": ref(tail_view["_id"]),
        "lineStyle": 1,
        "points": ";".join(f"{points[i]}:{points[i+1]}" for i in range(0, len(points), 2)),
        "showVisibility": True,
        "nameLabel": ref(name_lab["_id"]),
        "stereotypeLabel": ref(stereo["_id"]),
        "propertyLabel": ref(prop["_id"]),
    }


def build_state_machine(
    parent_id: str,
    name: str,
    documentation: str,
    spec: dict,
) -> dict:
    """
    spec:
      states: [{id, kind: initial|state|choice|final, name?, lane?, align?}]
      transitions: [{from, to, label}]
    """
    sm_id = IDS.next()
    region_id = IDS.next()
    diagram_id = IDS.next()

    main_col = 260
    left_col = 20
    right_col = 520
    gap = 90

    y_pos: dict[str, int] = {}
    main_i = 0
    for st in spec["states"]:
        if st.get("lane", "main") == "main":
            y_pos[st["id"]] = 40 + main_i * gap
            main_i += 1

    side_counters: dict[tuple[str, str], int] = {}
    for st in spec["states"]:
        lane = st.get("lane", "main")
        if lane == "main":
            continue
        align = st.get("align", "")
        key = (lane, align)
        offset = side_counters.get(key, 0)
        side_counters[key] = offset + 1
        base = y_pos.get(align, 40)
        y_pos[st["id"]] = base + offset * gap

    models: dict[str, dict] = {}
    views: dict[str, dict] = {}
    vertices: list[dict] = []
    owned_views: list[dict] = []

    for st in spec["states"]:
        sid = IDS.next()
        kind = st["kind"]
        key = st["id"]
        lane = st.get("lane", "main")
        top = y_pos[key]
        if lane == "main":
            left = main_col
        elif lane == "left":
            left = left_col
        else:
            left = right_col

        if kind == "initial":
            model = {
                "_type": "UMLPseudostate",
                "_id": sid,
                "_parent": ref(region_id),
                "kind": "initial",
            }
            view = make_pseudostate_view(diagram_id, sid, left + 70, top + 10)
        elif kind == "choice":
            model = {
                "_type": "UMLPseudostate",
                "_id": sid,
                "_parent": ref(region_id),
                "kind": "choice",
                "name": st.get("name", ""),
            }
            view = make_choice_view(diagram_id, sid, left + 68, top + 8)
        elif kind == "final":
            model = {
                "_type": "UMLFinalState",
                "_id": sid,
                "_parent": ref(region_id),
                "name": st.get("name", ""),
            }
            view = make_final_view(diagram_id, sid, left + 67, top + 7)
        elif kind == "state":
            model = {
                "_type": "UMLState",
                "_id": sid,
                "_parent": ref(region_id),
                "name": st["name"],
            }
            view = make_state_view(diagram_id, sid, st["name"], left, top)
        else:
            raise ValueError(kind)

        models[key] = model
        views[key] = view
        vertices.append(model)
        owned_views.append(view)

    transitions: list[dict] = []
    for edge in spec["transitions"]:
        frm, to, label = edge["from"], edge["to"], edge["label"]
        assert frm in models, f"missing state {frm} in {name}"
        assert to in models, f"missing state {to} in {name}"
        tid = IDS.next()
        ev = {
            "_type": "UMLEvent",
            "_id": IDS.next(),
            "_parent": ref(tid),
            "name": label,
        }
        tr = {
            "_type": "UMLTransition",
            "_id": tid,
            "_parent": ref(region_id),
            "source": ref(models[frm]["_id"]),
            "target": ref(models[to]["_id"]),
            "triggers": [ev],
        }
        transitions.append(tr)

        sv, tv = views[frm], views[to]
        sx, sy = cx(sv), bottom(sv)
        tx, ty = cx(tv), tv["top"]
        # side to side / up connections
        if abs(sx - tx) > 40 and abs(sy - ty) > 20:
            # route: down a bit / across / to target
            if tv["top"] >= sv["top"]:
                points = [sx, sy, sx, sy + 20, tx, sy + 20, tx, ty]
            else:
                points = [sx, mid_y(sv), tx, mid_y(sv), tx, ty]
        elif abs(sx - tx) > 40:
            points = [sx, mid_y(sv), tx, mid_y(sv), tx, mid_y(tv)]
        else:
            points = [sx, sy, tx, ty]

        owned_views.append(
            make_transition_view(diagram_id, tid, tv, sv, label, points)
        )

    diagram = {
        "_type": "UMLStatechartDiagram",
        "_id": diagram_id,
        "_parent": ref(sm_id),
        "name": name,
        "visible": True,
        "defaultDiagram": False,
        "ownedViews": owned_views,
    }

    region = {
        "_type": "UMLRegion",
        "_id": region_id,
        "_parent": ref(sm_id),
        "vertices": vertices,
        "transitions": transitions,
    }

    return {
        "_type": "UMLStateMachine",
        "_id": sm_id,
        "_parent": ref(parent_id),
        "name": name,
        "documentation": documentation,
        "ownedElements": [diagram],
        "regions": [region],
    }


# --- Business-logic state machines per user story ---

MACHINES: dict[str, dict] = {
    "E1_HU1": {
        "doc": (
            "HU01 — Registro con correo institucional\n"
            "Estados de la cuenta durante el registro y verificación.\n"
            "Paths: /registro, /registro/verificacion"
        ),
        "states": [
            {"id": "ini", "kind": "initial"},
            {"id": "form", "kind": "state", "name": "Formulario de registro"},
            {"id": "ch_dom", "kind": "choice", "name": "¿Dominio institucional?"},
            {
                "id": "rech",
                "kind": "state",
                "name": "Registro rechazado",
                "lane": "left",
                "align": "ch_dom",
            },
            {"id": "sin_ver", "kind": "state", "name": "Cuenta sin verificar"},
            {"id": "verif", "kind": "state", "name": "Cuenta verificada"},
            {"id": "fin", "kind": "final"},
            {"id": "fin_r", "kind": "final", "lane": "left", "align": "ch_dom"},
        ],
        "transitions": [
            {"from": "ini", "to": "form", "label": "abrir /registro"},
            {"from": "form", "to": "ch_dom", "label": "enviar registro"},
            {
                "from": "ch_dom",
                "to": "rech",
                "label": "[dominio ≠ @unicauca.edu.co]",
            },
            {
                "from": "ch_dom",
                "to": "sin_ver",
                "label": "[dominio = @unicauca.edu.co] / crear cuenta + enviar enlace",
            },
            {"from": "rech", "to": "fin_r", "label": "mostrar rechazo"},
            {
                "from": "sin_ver",
                "to": "verif",
                "label": "clic enlace /registro/verificacion",
            },
            {"from": "verif", "to": "fin", "label": "ofrecer ir a /login"},
        ],
    },
    "E1_HU2": {
        "doc": (
            "HU02 — Inicio de sesión validado\n"
            "Estados de autenticación y control de verificación.\n"
            "Path: /login"
        ),
        "states": [
            {"id": "ini", "kind": "initial"},
            {"id": "login", "kind": "state", "name": "Pantalla de login"},
            {"id": "ch_cred", "kind": "choice", "name": "¿Credenciales correctas?"},
            {
                "id": "err",
                "kind": "state",
                "name": "Error genérico",
                "lane": "left",
                "align": "ch_cred",
            },
            {"id": "ch_ver", "kind": "choice", "name": "¿Cuenta verificada?"},
            {
                "id": "pend",
                "kind": "state",
                "name": "Acceso bloqueado (sin verificar)",
                "lane": "right",
                "align": "ch_ver",
            },
            {"id": "auth", "kind": "state", "name": "Sesión autenticada"},
            {"id": "fin", "kind": "final"},
        ],
        "transitions": [
            {"from": "ini", "to": "login", "label": "abrir /login"},
            {"from": "login", "to": "ch_cred", "label": "iniciar sesión"},
            {"from": "ch_cred", "to": "err", "label": "[credenciales incorrectas]"},
            {"from": "err", "to": "login", "label": "reintentar"},
            {"from": "ch_cred", "to": "ch_ver", "label": "[credenciales correctas]"},
            {
                "from": "ch_ver",
                "to": "pend",
                "label": "[cuenta sin verificar]",
            },
            {"from": "pend", "to": "login", "label": "volver a login"},
            {
                "from": "ch_ver",
                "to": "auth",
                "label": "[cuenta verificada] / acceso al panel",
            },
            {"from": "auth", "to": "fin", "label": "sesión activa"},
        ],
    },
    "E2_HU1": {
        "doc": (
            "HU03 — Registrar vehículo y licencia\n"
            "Estados de habilitación del conductor.\n"
            "Path: /perfil/vehiculo"
        ),
        "states": [
            {"id": "ini", "kind": "initial"},
            {"id": "nohab", "kind": "state", "name": "No habilitado"},
            {"id": "form", "kind": "state", "name": "Registro de vehículo/licencia"},
            {"id": "ch_val", "kind": "choice", "name": "¿Datos válidos?"},
            {
                "id": "inv",
                "kind": "state",
                "name": "Datos inválidos",
                "lane": "left",
                "align": "ch_val",
            },
            {"id": "ch_lic", "kind": "choice", "name": "¿Licencia vigente?"},
            {
                "id": "venc",
                "kind": "state",
                "name": "Licencia no vigente",
                "lane": "right",
                "align": "ch_lic",
            },
            {"id": "hab", "kind": "state", "name": "Habilitado para publicar"},
            {"id": "fin", "kind": "final"},
        ],
        "transitions": [
            {"from": "ini", "to": "nohab", "label": "cuenta verificada sin vehículo"},
            {"from": "nohab", "to": "form", "label": "abrir /perfil/vehiculo"},
            {"from": "form", "to": "ch_val", "label": "guardar vehículo"},
            {"from": "ch_val", "to": "inv", "label": "[campos vacíos o placa inválida]"},
            {"from": "inv", "to": "form", "label": "corregir datos"},
            {"from": "ch_val", "to": "ch_lic", "label": "[campos válidos]"},
            {
                "from": "ch_lic",
                "to": "venc",
                "label": "[fecha vencimiento < hoy]",
            },
            {"from": "venc", "to": "nohab", "label": "mantener No habilitado"},
            {
                "from": "ch_lic",
                "to": "hab",
                "label": "[licencia vigente] / registrar vehículo",
            },
            {"from": "hab", "to": "fin", "label": "perfil actualizado"},
        ],
    },
    "E2_HU2": {
        "doc": (
            "HU04 — Publicar trayecto\n"
            "Estados de publicación de un trayecto.\n"
            "Path: /trayectos/publicar"
        ),
        "states": [
            {"id": "ini", "kind": "initial"},
            {"id": "pub", "kind": "state", "name": "Pantalla publicar trayecto"},
            {"id": "ch_hab", "kind": "choice", "name": "¿Conductor habilitado?"},
            {
                "id": "redir",
                "kind": "state",
                "name": "Debe registrar vehículo",
                "lane": "left",
                "align": "ch_hab",
            },
            {"id": "datos", "kind": "state", "name": "Datos del trayecto capturados"},
            {"id": "ch_cup", "kind": "choice", "name": "¿Cupos válidos?"},
            {
                "id": "inv",
                "kind": "state",
                "name": "Publicación rechazada",
                "lane": "right",
                "align": "ch_cup",
            },
            {"id": "disp", "kind": "state", "name": "Trayecto disponible"},
            {"id": "fin", "kind": "final"},
            {"id": "fin_r", "kind": "final", "lane": "left", "align": "ch_hab"},
        ],
        "transitions": [
            {"from": "ini", "to": "pub", "label": "abrir /trayectos/publicar"},
            {"from": "pub", "to": "ch_hab", "label": "intentar publicar"},
            {
                "from": "ch_hab",
                "to": "redir",
                "label": "[sin vehículo/licencia]",
            },
            {"from": "redir", "to": "fin_r", "label": "dirigir a /perfil/vehiculo"},
            {
                "from": "ch_hab",
                "to": "datos",
                "label": "[habilitado] / ingresar origen, sede, fecha, hora, cupos, aporte",
            },
            {"from": "datos", "to": "ch_cup", "label": "publicar trayecto"},
            {
                "from": "ch_cup",
                "to": "inv",
                "label": "[cupos ≤ 0 o > capacidad o campos vacíos]",
            },
            {"from": "inv", "to": "datos", "label": "corregir"},
            {
                "from": "ch_cup",
                "to": "disp",
                "label": "[cupos válidos] / crear trayecto",
            },
            {"from": "disp", "to": "fin", "label": "visible para pasajeros"},
        ],
    },
    "E2_HU3": {
        "doc": (
            "HU05 — Editar o cancelar trayecto\n"
            "Estados de un trayecto publicado.\n"
            "Path: /trayectos/editar"
        ),
        "states": [
            {"id": "ini", "kind": "initial"},
            {"id": "vig", "kind": "state", "name": "Trayecto vigente"},
            {"id": "ch_op", "kind": "choice", "name": "¿Editar o cancelar?"},
            {
                "id": "edit",
                "kind": "state",
                "name": "Editando trayecto",
                "lane": "left",
                "align": "ch_op",
            },
            {"id": "ch_res", "kind": "choice", "name": "¿Hay reservas?"},
            {
                "id": "conf",
                "kind": "state",
                "name": "Confirmación con pasajeros afectados",
                "lane": "right",
                "align": "ch_res",
            },
            {"id": "canc", "kind": "state", "name": "Trayecto cancelado"},
            {"id": "fin", "kind": "final"},
        ],
        "transitions": [
            {"from": "ini", "to": "vig", "label": "trayecto publicado"},
            {"from": "vig", "to": "ch_op", "label": "abrir /trayectos/editar"},
            {"from": "ch_op", "to": "edit", "label": "editar fecha/hora/cupos"},
            {
                "from": "edit",
                "to": "vig",
                "label": "guardar cambios / actualizar para no reservados",
            },
            {"from": "ch_op", "to": "ch_res", "label": "cancelar trayecto"},
            {
                "from": "ch_res",
                "to": "canc",
                "label": "[sin reservas] / estado Cancelado",
            },
            {
                "from": "ch_res",
                "to": "conf",
                "label": "[con reservas] / pedir confirmación",
            },
            {
                "from": "conf",
                "to": "canc",
                "label": "confirmar / cancelar reservas + notificar",
            },
            {
                "from": "canc",
                "to": "fin",
                "label": "retirar de búsqueda",
            },
        ],
    },
    "E3_HU1": {
        "doc": (
            "HU06 — Buscar trayectos disponibles\n"
            "Estados de la búsqueda de oferta.\n"
            "Path: /trayectos/buscar"
        ),
        "states": [
            {"id": "ini", "kind": "initial"},
            {"id": "bus", "kind": "state", "name": "Pantalla de búsqueda"},
            {"id": "filt", "kind": "state", "name": "Filtros aplicados"},
            {"id": "ch", "kind": "choice", "name": "¿Hay cupos disponibles?"},
            {
                "id": "vacio",
                "kind": "state",
                "name": "Sin resultados",
                "lane": "left",
                "align": "ch",
            },
            {"id": "list", "kind": "state", "name": "Resultados ordenados por hora"},
            {"id": "fin", "kind": "final"},
            {"id": "fin_v", "kind": "final", "lane": "left", "align": "ch"},
        ],
        "transitions": [
            {"from": "ini", "to": "bus", "label": "abrir /trayectos/buscar"},
            {
                "from": "bus",
                "to": "filt",
                "label": "filtrar sede, fecha y hora",
            },
            {
                "from": "filt",
                "to": "ch",
                "label": "buscar / excluir sin cupos",
            },
            {
                "from": "ch",
                "to": "vacio",
                "label": "[sin coincidencias]",
            },
            {"from": "vacio", "to": "fin_v", "label": "«No hay resultados disponibles»"},
            {
                "from": "ch",
                "to": "list",
                "label": "[hay trayectos con cupos]",
            },
            {"from": "list", "to": "fin", "label": "mostrar listado"},
            {"from": "vacio", "to": "bus", "label": "cambiar filtros"},
            {"from": "list", "to": "bus", "label": "nueva búsqueda"},
        ],
    },
    "E4_HU1": {
        "doc": (
            "HU07 — Reservar cupo en trayecto\n"
            "Estados de la reserva con control de concurrencia.\n"
            "Path: /trayectos/reservar"
        ),
        "states": [
            {"id": "ini", "kind": "initial"},
            {"id": "sel", "kind": "state", "name": "Trayecto seleccionado"},
            {"id": "res", "kind": "state", "name": "Confirmando reserva"},
            {"id": "ch", "kind": "choice", "name": "¿Cupo disponible?"},
            {
                "id": "agot",
                "kind": "state",
                "name": "Cupos agotados",
                "lane": "left",
                "align": "ch",
            },
            {"id": "conf", "kind": "state", "name": "Reserva confirmada"},
            {"id": "fin", "kind": "final"},
            {"id": "fin_a", "kind": "final", "lane": "left", "align": "ch"},
        ],
        "transitions": [
            {
                "from": "ini",
                "to": "sel",
                "label": "elegir trayecto desde búsqueda",
            },
            {"from": "sel", "to": "res", "label": "abrir /trayectos/reservar"},
            {"from": "res", "to": "ch", "label": "confirmar reserva"},
            {
                "from": "ch",
                "to": "agot",
                "label": "[sin cupo / segunda solicitud concurrente]",
            },
            {
                "from": "agot",
                "to": "fin_a",
                "label": "mensaje + volver a /trayectos/buscar",
            },
            {
                "from": "ch",
                "to": "conf",
                "label": "[cupo asignado] / descontar cupo en tiempo real",
            },
            {"from": "conf", "to": "fin", "label": "reserva activa"},
        ],
    },
    "E4_HU2": {
        "doc": (
            "HU08 — Cancelar reserva\n"
            "Estados de una reserva confirmada.\n"
            "Path: /reservas/cancelar"
        ),
        "states": [
            {"id": "ini", "kind": "initial"},
            {"id": "conf", "kind": "state", "name": "Reserva confirmada"},
            {"id": "ch", "kind": "choice", "name": "¿Trayecto ya inició?"},
            {
                "id": "bloq",
                "kind": "state",
                "name": "Cancelación impedida",
                "lane": "left",
                "align": "ch",
            },
            {"id": "canc", "kind": "state", "name": "Reserva cancelada"},
            {"id": "fin", "kind": "final"},
            {"id": "fin_b", "kind": "final", "lane": "left", "align": "ch"},
        ],
        "transitions": [
            {"from": "ini", "to": "conf", "label": "reserva existente"},
            {
                "from": "conf",
                "to": "ch",
                "label": "cancelar reserva en /reservas/cancelar",
            },
            {
                "from": "ch",
                "to": "bloq",
                "label": "[trayecto iniciado]",
            },
            {"from": "bloq", "to": "fin_b", "label": "mostrar mensaje de bloqueo"},
            {
                "from": "ch",
                "to": "canc",
                "label": "[no iniciado] / liberar cupo + notificar conductor",
            },
            {"from": "canc", "to": "fin", "label": "estado Cancelada"},
        ],
    },
    "E4_HU3": {
        "doc": (
            "HU09 — Consultar historial de trayectos y reservas\n"
            "Estados de consulta del historial.\n"
            "Path: /historial"
        ),
        "states": [
            {"id": "ini", "kind": "initial"},
            {"id": "hist", "kind": "state", "name": "Sección historial"},
            {"id": "ch", "kind": "choice", "name": "¿Hay actividad?"},
            {
                "id": "vacio",
                "kind": "state",
                "name": "Sin registros",
                "lane": "left",
                "align": "ch",
            },
            {
                "id": "lista",
                "kind": "state",
                "name": "Historial con estados",
            },
            {"id": "fin", "kind": "final"},
            {"id": "fin_v", "kind": "final", "lane": "left", "align": "ch"},
        ],
        "transitions": [
            {"from": "ini", "to": "hist", "label": "acceder a /historial"},
            {"from": "hist", "to": "ch", "label": "cargar actividad"},
            {"from": "ch", "to": "vacio", "label": "[sin actividad]"},
            {"from": "vacio", "to": "fin_v", "label": "mensaje sin registros"},
            {
                "from": "ch",
                "to": "lista",
                "label": "[hay actividad] / listar completado|cancelado|pendiente",
            },
            {"from": "lista", "to": "fin", "label": "consulta realizada"},
        ],
    },
    "E5_HU1": {
        "doc": (
            "HU10 — Contacto WhatsApp para el pasajero\n"
            "Estados del contacto externo al conductor.\n"
            "Path: /reservas/contacto-conductor"
        ),
        "states": [
            {"id": "ini", "kind": "initial"},
            {"id": "det", "kind": "state", "name": "Detalle de reserva"},
            {"id": "ch", "kind": "choice", "name": "¿WhatsApp válido?"},
            {
                "id": "na",
                "kind": "state",
                "name": "Contacto no disponible",
                "lane": "left",
                "align": "ch",
            },
            {"id": "wa", "kind": "state", "name": "Enlace wa.me abierto"},
            {"id": "fin", "kind": "final"},
            {"id": "fin_n", "kind": "final", "lane": "left", "align": "ch"},
        ],
        "transitions": [
            {
                "from": "ini",
                "to": "det",
                "label": "reserva confirmada /reservas/contacto-conductor",
            },
            {"from": "det", "to": "ch", "label": "clic contacto conductor"},
            {"from": "ch", "to": "na", "label": "[sin número válido]"},
            {"from": "na", "to": "fin_n", "label": "mostrar alternativa"},
            {
                "from": "ch",
                "to": "wa",
                "label": "[número válido] / abrir wa.me (sin chat interno)",
            },
            {"from": "wa", "to": "fin", "label": "coordinación externa"},
        ],
    },
    "E5_HU2": {
        "doc": (
            "HU11 — Contacto WhatsApp para el conductor\n"
            "Estados del listado de contacto a pasajeros.\n"
            "Path: /trayectos/pasajeros/contacto"
        ),
        "states": [
            {"id": "ini", "kind": "initial"},
            {"id": "lista", "kind": "state", "name": "Lista de pasajeros"},
            {"id": "ch", "kind": "choice", "name": "¿Reserva confirmada?"},
            {
                "id": "oculto",
                "kind": "state",
                "name": "Sin enlace (canceló)",
                "lane": "left",
                "align": "ch",
            },
            {"id": "wa", "kind": "state", "name": "Enlace wa.me visible"},
            {"id": "fin", "kind": "final"},
        ],
        "transitions": [
            {
                "from": "ini",
                "to": "lista",
                "label": "abrir /trayectos/pasajeros/contacto",
            },
            {"from": "lista", "to": "ch", "label": "evaluar cada pasajero"},
            {
                "from": "ch",
                "to": "oculto",
                "label": "[reserva cancelada] / ocultar enlace",
            },
            {"from": "oculto", "to": "lista", "label": "actualizar lista"},
            {
                "from": "ch",
                "to": "wa",
                "label": "[reserva confirmada] / mostrar wa.me",
            },
            {"from": "wa", "to": "fin", "label": "contacto disponible"},
            {"from": "wa", "to": "lista", "label": "volver a lista"},
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
    root_pkg_id = IDS.next()
    epic_packages: list[dict] = []

    for epic in EPICS:
        pkg_id = IDS.next()
        machines = [
            build_state_machine(
                pkg_id,
                hu_key,
                MACHINES[hu_key]["doc"],
                MACHINES[hu_key],
            )
            for hu_key in epic["hus"]
        ]
        epic_packages.append(
            {
                "_type": "UMLPackage",
                "_id": pkg_id,
                "_parent": ref(root_pkg_id),
                "name": epic["name"],
                "documentation": epic["title"],
                "ownedElements": machines,
            }
        )

    return {
        "_type": "Project",
        "_id": project_id,
        "name": "RideU",
        "ownedElements": [
            {
                "_type": "UMLPackage",
                "_id": root_pkg_id,
                "_parent": ref(project_id),
                "name": "Diagramas_De_Proceso",
                "documentation": (
                    "Diagramas de estados de RideU organizados por épicas e historias "
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
            if set(obj.keys()) == {"$ref"}:
                refs_found.append(obj["$ref"])
            for v in obj.values():
                walk(v)
        elif isinstance(obj, list):
            for v in obj:
                walk(v)

    walk(project)
    missing = [r for r in refs_found if r not in ids]
    assert not missing, f"missing refs: {missing[:15]}"

    # Structural + connectivity checks
    machines = []

    def find_machines(obj):
        if isinstance(obj, dict):
            if obj.get("_type") == "UMLStateMachine":
                machines.append(obj)
            for v in obj.values():
                find_machines(v)
        elif isinstance(obj, list):
            for v in obj:
                find_machines(v)

    find_machines(project)
    assert len(machines) == 11, len(machines)

    for sm in machines:
        assert sm["ownedElements"][0]["_type"] == "UMLStatechartDiagram"
        region = sm["regions"][0]
        vertex_ids = {v["_id"] for v in region["vertices"]}
        initials = [v for v in region["vertices"] if v.get("kind") == "initial"]
        assert len(initials) == 1, sm["name"]
        assert region["transitions"], f"{sm['name']} has no transitions"

        # Every transition connects existing vertices
        outgoing = {vid: 0 for vid in vertex_ids}
        incoming = {vid: 0 for vid in vertex_ids}
        for tr in region["transitions"]:
            s, t = tr["source"]["$ref"], tr["target"]["$ref"]
            assert s in vertex_ids and t in vertex_ids, sm["name"]
            assert tr.get("triggers"), f"{sm['name']} transition without label"
            outgoing[s] += 1
            incoming[t] += 1

        # Initial must have outgoing; finals may have none
        assert outgoing[initials[0]["_id"]] >= 1, sm["name"]
        for v in region["vertices"]:
            if v["_type"] == "UMLState":
                assert outgoing[v["_id"]] + incoming[v["_id"]] >= 1, (
                    f"{sm['name']} isolated state {v.get('name')}"
                )

        # Diagram views must include transition views matching transitions
        diagram = sm["ownedElements"][0]
        tviews = [
            v for v in diagram["ownedViews"] if v["_type"] == "UMLTransitionView"
        ]
        assert len(tviews) == len(region["transitions"]), sm["name"]
        for tv in tviews:
            assert "points" in tv and tv["points"], f"{sm['name']} empty points"
            assert "head" in tv and "tail" in tv, sm["name"]


def main() -> None:
    out = Path(__file__).resolve().parent / "RideU_Diagramas_De_Proceso.mdj"
    project = build_project()
    validate(project)
    out.write_text(json.dumps(project, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {out} ({out.stat().st_size} bytes)")
    root = project["ownedElements"][0]
    print(f"{project['name']} / {root['name']}")
    for pkg in root["ownedElements"]:
        print(f"  {pkg['name']}")
        for sm in pkg["ownedElements"]:
            region = sm["regions"][0]
            n_states = sum(1 for v in region["vertices"] if v["_type"] == "UMLState")
            n_tr = len(region["transitions"])
            print(f"    {sm['name']}  [states={n_states} transitions={n_tr}]")


if __name__ == "__main__":
    main()
