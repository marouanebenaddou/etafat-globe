"""Grid ↔ ECEF conversions driven by a user-supplied CRS definition.

The ETAFAT field crews hand us two text files per project:

* ``bases_xyz.txt`` — one line per base station, comma- or whitespace-
  separated ``name, North, East, Elevation``. The "XYZ" in the filename is
  a misnomer — these are projected grid coordinates, not geocentric ECEF.

* ``<zone>.txt`` (e.g. ``CIV.txt`` for Côte d'Ivoire) — human-readable CRS
  definition. Ellipsoid, projection type + parameters, datum transform,
  geoid model. Shape is CHC-specific but regular enough to parse.

This module turns the two into ECEF XYZ coordinates rnx2rtkp can use as
its ``-r`` reference. Much more accurate than the RINEX header's APPROX
POSITION XYZ (which is SPP-level, ≈3 m).
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional


# ───────────────────────────── data classes ────────────────────────────────

@dataclass
class BaseCoordLine:
    name:   str
    north:  float
    east:   float
    elev:   float


@dataclass
class CRSDef:
    ellipsoid_name:  str = "GRS1980"
    semi_major_a:    float = 6378137.0
    inverse_flat:    float = 298.257222101206
    projection_type: str = "tmerc"         # proj name
    central_meridian_deg: float = 0.0
    origin_latitude_deg:  float = 0.0
    scale_factor:    float = 1.0
    false_easting:   float = 0.0
    false_northing:  float = 0.0
    projection_height_m: float = 0.0
    geoid:           str = ""
    datum_transform: str = ""              # free-form, noted for info only


# ───────────────────────────── parsers ─────────────────────────────────────

def parse_bases_coords(text: str) -> list[BaseCoordLine]:
    """Accept the CHC-style `bases_xyz.txt` format.

    Examples of supported lines:
        Moyen2d,962565.347,273147.544,454.832,
        Moyen3d  961074.865  271066.473  457.317
    Lines that don't parse (headers, blanks, comments) are skipped silently.
    """
    out: list[BaseCoordLine] = []
    for raw in text.splitlines():
        line = raw.split("#")[0].strip().rstrip(",")
        if not line:
            continue
        parts = re.split(r"[,\s]+", line)
        parts = [p for p in parts if p]
        if len(parts) < 4:
            continue
        try:
            out.append(BaseCoordLine(
                name  = parts[0],
                north = float(parts[1]),
                east  = float(parts[2]),
                elev  = float(parts[3]),
            ))
        except ValueError:
            continue
    return out


# Degrees can appear as 5°30'W  or  5°30'00"W  or  -5.5
_DMS_RE = re.compile(
    r"(?P<d>\d+)\s*°\s*(?P<m>\d+)?\s*(?:['′])?\s*(?P<s>\d+(?:\.\d+)?)?\s*(?:[\"″])?\s*(?P<hemi>[NSEW])?"
)


def _parse_dms(s: str) -> float:
    m = _DMS_RE.search(s)
    if not m:
        try: return float(s)
        except ValueError: return 0.0
    d = float(m.group("d"))
    mi = float(m.group("m") or 0)
    se = float(m.group("s") or 0)
    sign = -1 if (m.group("hemi") in ("S", "W")) else 1
    return sign * (d + mi/60.0 + se/3600.0)


def parse_crs_definition(text: str) -> CRSDef:
    """Parse CHC's ``<zone>.txt`` CRS definition. Any unknown fields are
    left at safe defaults. The important ones for the Transverse Mercator
    CIV case are central meridian, scale factor, and the false offsets.
    """
    c = CRSDef()
    # Ellipsoid line: "Ellipsoide GRS1980 ( a=6378137  1/f= 298.257222101206 ...)"
    m = re.search(r"Ellipsoid[e]?\s+(\S+)", text, re.IGNORECASE)
    if m: c.ellipsoid_name = m.group(1)
    m = re.search(r"a\s*=\s*([0-9.]+)", text)
    if m: c.semi_major_a = float(m.group(1))
    m = re.search(r"1\s*/\s*f\s*=\s*([0-9.]+)", text)
    if m: c.inverse_flat = float(m.group(1))

    if re.search(r"Transverse\s+Mercator", text, re.IGNORECASE):
        c.projection_type = "tmerc"

    m = re.search(r"Central\s+Meridian\s*:?\s*([-0-9.]+\s*°[^;)]*)", text, re.IGNORECASE)
    if m: c.central_meridian_deg = _parse_dms(m.group(1))
    m = re.search(r"Origin(?:e)?\s+Latitude\s*:?\s*([-0-9.]+\s*°[^;)]*)", text, re.IGNORECASE)
    if m: c.origin_latitude_deg = _parse_dms(m.group(1))
    m = re.search(r"Scale\s+Factor\s*:?\s*([0-9.]+)", text, re.IGNORECASE)
    if m: c.scale_factor = float(m.group(1))
    m = re.search(r"False\s+Easting(?:\(m\))?\s*:?\s*([0-9.]+)", text, re.IGNORECASE)
    if m: c.false_easting = float(m.group(1))
    m = re.search(r"False\s+Northing(?:\(m\))?\s*:?\s*([0-9.]+)", text, re.IGNORECASE)
    if m: c.false_northing = float(m.group(1))
    m = re.search(r"Projection\s+Height(?:\(m\))?\s*:?\s*([0-9.]+)", text, re.IGNORECASE)
    if m: c.projection_height_m = float(m.group(1))

    m = re.search(r"Geoid\s+Model\s+(\S+)", text, re.IGNORECASE)
    if m: c.geoid = m.group(1)
    m = re.search(r"Datum\s+Transform\s+([^\n]+)", text, re.IGNORECASE)
    if m: c.datum_transform = m.group(1).strip()
    return c


# ───────────────────────────── conversion ──────────────────────────────────

def crs_def_to_proj_string(c: CRSDef) -> str:
    """Build a PROJ-style projection string for pyproj from the parsed CRS."""
    # GRS80 is identical to the grid's GRS1980 ellipsoid for our purposes.
    ellps = "GRS80" if c.semi_major_a > 6.3e6 else "WGS84"
    return (
        f"+proj={c.projection_type} "
        f"+lon_0={c.central_meridian_deg} "
        f"+lat_0={c.origin_latitude_deg} "
        f"+k={c.scale_factor} "
        f"+x_0={c.false_easting} "
        f"+y_0={c.false_northing} "
        f"+ellps={ellps} "
        f"+units=m +no_defs"
    )


def grid_to_ecef(bases: list[BaseCoordLine], crs: CRSDef
                 ) -> list[tuple[str, float, float, float]]:
    """Convert every (north, east, elev) into ECEF (X, Y, Z).

    The result uses the ellipsoid of ``crs`` and NO datum transform — for
    AR seeding this is good enough (decimetre-level errors don't break
    integer search on < 20 km baselines). For precise control-point use
    downstream the caller should apply the project's Helmert shift if
    documented.
    """
    try:
        from pyproj import Transformer
    except ImportError as e:       # pragma: no cover
        raise RuntimeError(f"pyproj is required for grid→ECEF conversion: {e}")

    ecef_crs = "+proj=geocent +ellps=GRS80 +units=m +no_defs"
    tm_crs   = crs_def_to_proj_string(crs)
    fwd = Transformer.from_crs(tm_crs, ecef_crs, always_xy=True)
    out: list[tuple[str, float, float, float]] = []
    for b in bases:
        # pyproj TM expects (x=east, y=north). z is ellipsoidal height.
        X, Y, Z = fwd.transform(b.east, b.north, b.elev)
        out.append((b.name, X, Y, Z))
    return out


def match_marker_to_coord(marker: str, coord_name: str) -> bool:
    """Loose name match — the field file often writes 'Moyen2d' while the
    RINEX marker is 'moyen2' (or 'Moyen3' vs 'Moyen3d'). We strip a trailing
    'd' and compare case-insensitively."""
    a = marker.strip().lower().rstrip("d")
    b = coord_name.strip().lower().rstrip("d")
    return a == b or a.startswith(b) or b.startswith(a)
