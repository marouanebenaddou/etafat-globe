"""PDF report generator for the ETAFAT GNSS pipeline output.

Produces a single consolidated document mirroring what CHC Geomatics Office
delivers as four separate PDFs:

  1. Baseline summary — per-baseline length, solution type, RMS, σ, and
     (for kinematic stops) the dwell time and Fix ratio.
  2. Loop closures — misclosure in horizontal + vertical components, PPM,
     per-loop conformity flag.
  3. Free network adjustment — χ² test, precision, adjusted coords in
     both ECEF and local grid (Nord / Est / Élév) when a CRS was supplied.
  4. Constrained adjustment — same table but computed with control points
     held fixed. Omitted if the request had no control stations.

The layout is a single PDF with four sections and a short cover page. No
external template file — reportlab builds it programmatically, which keeps
the backend dependency footprint small.
"""
from __future__ import annotations

import datetime as _dt
import io
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether,
)

# ETAFAT brand colours (blue and dark slate).
PRIMARY = colors.HexColor("#007BFF")
DARK    = colors.HexColor("#0a1628")
MUTED   = colors.HexColor("#64748b")
LIGHT   = colors.HexColor("#f6f8fb")
BORDER  = colors.HexColor("#e2e8f0")
OK_GREEN = colors.HexColor("#10b981")
WARN_AMBER = colors.HexColor("#f59e0b")


# ──────────────────────────────── styles ────────────────────────────────────

def _styles() -> dict[str, ParagraphStyle]:
    s = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title", parent=s["Title"], fontSize=18, leading=22,
            textColor=DARK, spaceAfter=4,
        ),
        "subtitle": ParagraphStyle(
            "subtitle", parent=s["Normal"], fontSize=10,
            textColor=MUTED, spaceAfter=18,
        ),
        "section": ParagraphStyle(
            "section", parent=s["Heading2"], fontSize=13, leading=18,
            textColor=PRIMARY, spaceBefore=10, spaceAfter=6,
        ),
        "caption": ParagraphStyle(
            "caption", parent=s["Normal"], fontSize=9,
            textColor=MUTED, spaceBefore=2, spaceAfter=6,
        ),
        "normal": ParagraphStyle(
            "normal", parent=s["Normal"], fontSize=9.5, leading=13,
            textColor=DARK,
        ),
        "kpi": ParagraphStyle(
            "kpi", parent=s["Normal"], fontSize=10, leading=14,
            textColor=DARK, leftIndent=2,
        ),
    }


def _header_footer(canvas, doc):
    """Draw page header + footer on every page."""
    w, h = A4
    canvas.saveState()
    # Header bar
    canvas.setFillColor(DARK)
    canvas.rect(0, h - 15*mm, w, 15*mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(15*mm, h - 10*mm, "ETAFAT — Rapport GNSS")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(w - 15*mm, h - 10*mm,
                           _dt.datetime.now().strftime("%Y-%m-%d %H:%M"))
    # Footer page number
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(w - 15*mm, 10*mm, f"Page {doc.page}")
    canvas.drawString(15*mm, 10*mm,
                      "Traité par le moteur ETAFAT GNSS · RTKLIB rnx2rtkp")
    canvas.restoreState()


# ──────────────────────────────── tables ────────────────────────────────────

_TABLE_STYLE = TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
    ("TEXTCOLOR",  (0, 0), (-1, 0), DARK),
    ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE",   (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
    ("TOPPADDING", (0, 0), (-1, 0), 5),
    ("LINEBELOW",  (0, 0), (-1, 0), 0.6, BORDER),
    ("LINEBELOW",  (0, -1), (-1, -1), 0.4, BORDER),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING",  (0, 0), (-1, -1), 4),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
])


def _fmt(v: Any, digits: int = 3) -> str:
    if v is None: return "—"
    if isinstance(v, (int,)): return str(v)
    if isinstance(v, float):  return f"{v:.{digits}f}"
    return str(v)


# ──────────────────────────────── sections ──────────────────────────────────

def _cover_section(styles, result: dict, meta: dict) -> list:
    kpi_rows = [
        ["Projet", meta.get("project", "—")],
        ["Date de traitement", _dt.datetime.now().strftime("%d/%m/%Y %H:%M")],
        ["Nombre de lignes de base", str(result.get("n_baselines", 0))],
        ["Nombre de stations", str(result.get("n_stations", 0))],
        ["Boucles fermées", str(len(result.get("loops", [])))],
        ["Moteur", "ETAFAT GNSS v1 · RTKLIB rnx2rtkp"],
    ]
    free = result.get("free") or {}
    cons = result.get("constrained") or {}
    if free:
        kpi_rows.append(["σ₀ ajustement libre",
                         _fmt(free.get("sigma0"), 3)])
        kpi_rows.append(["Précision planimétrique (2σ)",
                         f"{free.get('horiz_accuracy_mm', 0):.1f} mm"])
        kpi_rows.append(["Précision altimétrique (2σ)",
                         f"{free.get('vert_accuracy_mm',  0):.1f} mm"])
    if cons:
        kpi_rows.append(["σ₀ ajustement contraint",
                         _fmt(cons.get("sigma0"), 3)])

    t = Table(kpi_rows, colWidths=[75*mm, 100*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("TEXTCOLOR",  (0, 0), (0, -1), MUTED),
        ("FONTNAME",   (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 9.5),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW",  (0, 0), (-1, -1), 0.3, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return [
        Paragraph("Rapport de traitement GNSS", styles["title"]),
        Paragraph("Calcul des lignes de base, fermeture des boucles et ajustements",
                  styles["subtitle"]),
        Spacer(1, 6),
        t,
        Spacer(1, 12),
        Paragraph(
            "Les sections suivantes détaillent chacune des étapes du pipeline : "
            "vecteurs de ligne de base, fermeture des boucles, ajustement libre "
            "et (si applicable) ajustement contraint avec points de contrôle.",
            styles["normal"]),
    ]


def _baselines_section(styles, result: dict) -> list:
    bls = result.get("baselines_detail") or []
    if not bls:
        return []
    rows = [[
        "ID", "De", "Vers", "Long. (m)", "Type",
        "RMS (mm)", "σ X/Y/Z (mm)", "Dwell", "Fix %", "Sat",
    ]]
    for b in bls:
        sx, sy, sz = b.get("sdx_m", 0)*1000, b.get("sdy_m", 0)*1000, b.get("sdz_m", 0)*1000
        dwell = f"{b['duration_s']:.0f} s" if b.get("duration_s") else "—"
        fr    = f"{b['fix_ratio']*100:.0f}%" if b.get("fix_ratio") is not None else "—"
        ns    = str(b["n_sat"]) if b.get("n_sat") is not None else "—"
        rows.append([
            b.get("id", ""), b.get("start", ""), b.get("end", ""),
            f"{b.get('length_m', 0):.3f}",
            b.get("solution_type", ""),
            f"{b.get('rms_m', 0)*1000:.2f}",
            f"{sx:.1f}/{sy:.1f}/{sz:.1f}",
            dwell, fr, ns,
        ])
    t = Table(rows, colWidths=[14*mm, 22*mm, 30*mm, 22*mm, 20*mm,
                                16*mm, 28*mm, 12*mm, 12*mm, 10*mm])
    t.setStyle(_TABLE_STYLE)
    return [
        Paragraph("1. Lignes de base", styles["section"]),
        Paragraph(
            f"{len(bls)} lignes calculées. Les baselines cinématiques "
            "(stop-and-go PPK) affichent la durée d'occupation et le taux "
            "de solutions Fix — les statiques laissent ces champs vides.",
            styles["caption"]),
        t,
    ]


def _loops_section(styles, result: dict) -> list:
    loops = result.get("loops") or []
    if not loops:
        return []
    rows = [["Boucle", "Lignes", "Longueur (m)", "ΔH (m)", "ΔV (m)",
             "PPM", "Statut"]]
    for lp in loops:
        status = "Conforme" if lp.get("conform") else "Hors tolérance"
        rows.append([
            lp.get("id", ""),
            " · ".join(lp.get("baselines", [])[:6])
             + (" …" if len(lp.get("baselines", [])) > 6 else ""),
            f"{lp.get('length_m', 0):.2f}",
            f"{lp.get('dh_m', 0)*1000:.2f} mm",
            f"{lp.get('dv_m', 0)*1000:.2f} mm",
            f"{lp.get('ppm', 0):.2f}",
            status,
        ])
    t = Table(rows, colWidths=[14*mm, 60*mm, 22*mm, 22*mm, 22*mm, 14*mm, 24*mm])
    style = TableStyle(_TABLE_STYLE.getCommands())
    for i, lp in enumerate(loops, start=1):
        fg = OK_GREEN if lp.get("conform") else WARN_AMBER
        style.add("TEXTCOLOR", (-1, i), (-1, i), fg)
        style.add("FONTNAME",  (-1, i), (-1, i), "Helvetica-Bold")
    t.setStyle(style)
    return [
        Paragraph("2. Fermeture des boucles", styles["section"]),
        Paragraph(
            f"{len(loops)} boucles fondamentales détectées. "
            "ΔH et ΔV reportent la misclosure en composantes horizontale et "
            "verticale locales. Le PPM compare à la longueur totale de la boucle.",
            styles["caption"]),
        t,
    ]


def _adjustment_section(styles, label: str, section_n: int, rep: dict | None) -> list:
    if not rep:
        return []
    # When the adjustment ran on a network without redundancy
    # (DoF = 0, no observations), the numeric report is meaningless —
    # swap the tables for a plain-French explanation so the PDF doesn't
    # show misleading zeros.
    n_obs = int(rep.get("n_obs", 0) or 0)
    dof   = int(rep.get("dof",   0) or 0)
    if n_obs == 0 or dof == 0:
        return [
            PageBreak(),
            Paragraph(f"{section_n}. Ajustement {label.lower()}", styles["section"]),
            Paragraph(
                "Réseau non redondant — ajustement non applicable.",
                styles["normal"]),
            Spacer(1, 6),
            Paragraph(
                "Pour qu'un ajustement libre par moindres carrés soit significatif, "
                "il faut au minimum plus de vecteurs de ligne de base que d'inconnues "
                "(chaque station libre = 3 inconnues X/Y/Z). Ce calcul n'a pas atteint "
                "ce seuil : seules les lignes reliant des bases déclarées "
                "(is_control = True) entrent dans le système, et les lignes cinématiques "
                "(stop-and-go PPK) sont délibérément exclues car elles représentent des "
                "mesures directes isolées, pas des observations redondantes entre "
                "points connus.",
                styles["caption"]),
            Spacer(1, 6),
            Paragraph(
                "Pour obtenir un véritable ajustement, ajoutez au moins une base "
                "supplémentaire (les vecteurs base↔base fourniront la redondance) "
                "ou occupez plusieurs points de contrôle sur lesquels ancrer le réseau.",
                styles["caption"]),
        ]
    chi2_pass = "✓ validé" if rep.get("chi2_pass") else "✗ échoué"
    kpis = [
        ["Type", label],
        ["σ₀",   f"{rep.get('sigma0', 0):.3f}"],
        ["χ²",   f"{rep.get('chi2', 0):.3f}  ({chi2_pass})"],
        ["DoF",  str(rep.get("dof", 0))],
        ["n obs", str(rep.get("n_obs", 0))],
        ["Précision H (2σ)", f"{rep.get('horiz_accuracy_mm', 0):.1f} mm"],
        ["Précision V (2σ)", f"{rep.get('vert_accuracy_mm',  0):.1f} mm"],
    ]
    kpi_table = Table(kpis, colWidths=[55*mm, 50*mm])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("FONTNAME",   (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("LINEBELOW",  (0, 0), (-1, -1), 0.3, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
    ]))

    # Points table — grid if available, else ECEF
    pts = rep.get("points") or []
    any_grid = any(p.get("grid") for p in pts)
    if any_grid:
        head = ["Point", "Nord (m)", "Est (m)", "Élév (m)",
                "σN (mm)", "σE (mm)", "σH (mm)", "Type"]
        data: list[list] = []
        for p in pts:
            g = p.get("grid") or {}
            data.append([
                p.get("name", ""),
                f"{g.get('north', 0):.4f}",
                f"{g.get('east',  0):.4f}",
                f"{g.get('elev',  0):.4f}",
                f"{p.get('sx', 0)*1000:.1f}",
                f"{p.get('sy', 0)*1000:.1f}",
                f"{p.get('sz', 0)*1000:.1f}",
                "Contrôle" if p.get("is_control") else "Ajusté",
            ])
        widths = [26*mm, 26*mm, 26*mm, 22*mm, 16*mm, 16*mm, 16*mm, 20*mm]
    else:
        head = ["Point", "X ECEF (m)", "Y ECEF (m)", "Z ECEF (m)",
                "σX (mm)", "σY (mm)", "σZ (mm)", "Type"]
        data = []
        for p in pts:
            data.append([
                p.get("name", ""),
                f"{p.get('x', 0):.4f}",
                f"{p.get('y', 0):.4f}",
                f"{p.get('z', 0):.4f}",
                f"{p.get('sx', 0)*1000:.1f}",
                f"{p.get('sy', 0)*1000:.1f}",
                f"{p.get('sz', 0)*1000:.1f}",
                "Contrôle" if p.get("is_control") else "Ajusté",
            ])
        widths = [26*mm, 30*mm, 30*mm, 30*mm, 14*mm, 14*mm, 14*mm, 20*mm]

    pts_table = Table([head] + data, colWidths=widths, repeatRows=1)
    pts_table.setStyle(_TABLE_STYLE)

    return [
        PageBreak(),
        Paragraph(f"{section_n}. Ajustement {label.lower()}", styles["section"]),
        Paragraph(
            "Résolution par moindres carrés (Gauss-Markov) sur les vecteurs "
            "de ligne de base. "
            + ("Aucun point de contrôle — le datum est fixé par la première station."
               if "libre" in label.lower() else
               "Les points marqués « Contrôle » sont maintenus rigidement à leurs "
               "coordonnées connues pendant la résolution."),
            styles["caption"]),
        kpi_table,
        Spacer(1, 8),
        Paragraph(
            f"Coordonnées ajustées ({'grille Nord/Est' if any_grid else 'ECEF'})",
            styles["normal"]),
        pts_table,
    ]


# ──────────────────────────────── entrypoint ────────────────────────────────

def build_pdf_report(result: dict, project_name: str = "") -> bytes:
    """Produce the consolidated 4-section PDF. Returns raw bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        rightMargin=15*mm, leftMargin=15*mm,
        topMargin=22*mm, bottomMargin=18*mm,
        title="ETAFAT Rapport GNSS",
    )
    styles = _styles()
    story: list = []

    story += _cover_section(styles, result, {"project": project_name or "—"})
    story.append(PageBreak())
    story += _baselines_section(styles, result)
    story.append(PageBreak())
    story += _loops_section(styles, result)
    story += _adjustment_section(styles, "Libre",     3, result.get("free"))
    story += _adjustment_section(styles, "Contraint", 4, result.get("constrained"))

    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)
    return buf.getvalue()
