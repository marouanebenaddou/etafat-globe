"""Loop-closure detection and computation.

For every closed loop in a network of baselines, the vector sum of (signed)
ΔX/ΔY/ΔZ must be zero if all observations are perfectly consistent.
Residuals give the misclosure vector.

Loops are detected as fundamental cycles in the undirected graph of stations,
using a spanning tree: each non-tree edge closes exactly one cycle with the
tree path between its endpoints.
"""
from __future__ import annotations

import math
from collections import defaultdict
from typing import Iterable, Sequence

from .models import Baseline, Loop


# ───────────────────────────── graph / spanning tree ────────────────────────

def _build_graph(baselines: Iterable[Baseline]
                 ) -> dict[str, list[tuple[str, str, int]]]:
    """Adjacency list: node -> [(neighbour, baseline_id, sign), ...].

    sign is +1 if traversing node→neighbour matches the baseline's own
    orientation (start→end), -1 if reversed.
    """
    g: dict[str, list[tuple[str, str, int]]] = defaultdict(list)
    for b in baselines:
        g[b.start].append((b.end,   b.id, +1))
        g[b.end  ].append((b.start, b.id, -1))
    return g


def _spanning_tree(g: dict[str, list]
                   ) -> tuple[dict[str, tuple[str | None, str | None, int]], set[str]]:
    """BFS spanning tree.

    Returns (parent_info, tree_edge_ids) where parent_info[node] is
    ``(parent_name, baseline_id, sign_to_parent)`` — the sign is the direction
    you traverse the baseline when walking node→parent.
    """
    if not g:
        return {}, set()
    root = next(iter(g))
    parent: dict[str, tuple[str | None, str | None, int]] = {root: (None, None, 0)}
    tree_edges: set[str] = set()
    queue = [root]
    while queue:
        u = queue.pop(0)
        for v, bid, sgn in g[u]:
            if v not in parent:
                # Walking v→u uses this baseline; sign from u→v was `sgn`, so
                # v→u is the reverse: -sgn.
                parent[v] = (u, bid, -sgn)
                tree_edges.add(bid)
                queue.append(v)
    return parent, tree_edges


def _path_to_root(node: str,
                  parent: dict[str, tuple[str | None, str | None, int]]
                  ) -> list[tuple[str, int]]:
    """Return the tree path from ``node`` up to the root as a list of
    ``(baseline_id, sign)`` — ``sign`` is the direction to apply to the
    baseline vector when walking in the direction *up* the tree."""
    out: list[tuple[str, int]] = []
    cur: str | None = node
    while cur is not None and parent[cur][0] is not None:
        p, bid, sgn = parent[cur]
        out.append((bid, sgn))  # type: ignore[arg-type]
        cur = p
    return out


def _tree_path_between(a: str, b: str,
                       parent: dict[str, tuple[str | None, str | None, int]]
                       ) -> list[tuple[str, int]]:
    """Tree path from ``a`` to ``b`` as [(baseline_id, sign), ...],
    where sign is the direction to apply when traversing *that* step."""
    pa = _path_to_root(a, parent)   # a → root
    pb = _path_to_root(b, parent)   # b → root

    # Strip the common suffix (shared portion up to the LCA).
    while pa and pb and pa[-1] == pb[-1]:
        pa.pop()
        pb.pop()
    # Path a → b = (a → LCA) forward + (LCA → b) which is (b → LCA) reversed
    # and with each step's sign flipped.
    return pa + [(bid, -sgn) for bid, sgn in reversed(pb)]


# ───────────────────────────── loop detection ───────────────────────────────

def detect_loops(baselines: list[Baseline]) -> list[Loop]:
    """Return one loop per non-tree edge (fundamental cycle basis).

    Each loop traces the non-tree edge (start→end, sign +1) followed by the
    tree path end→start, so the loop is closed and the vector sum should be
    ~zero.
    """
    g = _build_graph(baselines)
    parent, tree_edges = _spanning_tree(g)
    by_id = {b.id: b for b in baselines}

    loops: list[Loop] = []
    for n, b in enumerate((x for x in baselines if x.id not in tree_edges), start=1):
        path = _tree_path_between(b.end, b.start, parent)   # closes end→start
        bids = [b.id] + [bid for bid, _ in path]
        dirs = [+1]   + [sgn for _, sgn in path]
        loop = Loop(id=f"C{n}", baseline_ids=bids, directions=dirs)
        _fill_ecef_closure(loop, by_id)
        loops.append(loop)
    return loops


def _fill_ecef_closure(loop: Loop, by_id: dict[str, Baseline]) -> None:
    """Raw ECEF misclosure and total length (used as a first-pass check)."""
    dx = dy = dz = 0.0
    total = 0.0
    for bid, sgn in zip(loop.baseline_ids, loop.directions):
        b = by_id[bid]
        dx += sgn * b.dx
        dy += sgn * b.dy
        dz += sgn * b.dz
        total += b.length
    loop.length = total
    loop.dh = math.hypot(dx, dy)   # placeholder; overwritten by ENU version
    loop.dv = dz
    mag = math.sqrt(dx*dx + dy*dy + dz*dz)
    loop.ppm = (mag / total * 1e6) if total > 0 else 0.0
    loop.conform = (abs(loop.dh) <= 1.0) and (abs(loop.dv) <= 2.0)


# ───────────────────────────── ENU misclosure ──────────────────────────────

def loop_misclosure_enu(loop: Loop, by_id: dict[str, Baseline],
                        lat_rad: float, lon_rad: float) -> tuple[float, float, float]:
    """Return (dN, dE, dU) misclosure in a local ENU frame at (lat, lon)."""
    dx = dy = dz = 0.0
    for bid, sgn in zip(loop.baseline_ids, loop.directions):
        b = by_id[bid]
        dx += sgn * b.dx
        dy += sgn * b.dy
        dz += sgn * b.dz
    sl, cl = math.sin(lat_rad), math.cos(lat_rad)
    so, co = math.sin(lon_rad), math.cos(lon_rad)
    dN = -sl * co * dx - sl * so * dy + cl * dz
    dE = -so      * dx + co      * dy
    dU =  cl * co * dx + cl * so * dy + sl * dz
    return dN, dE, dU


def refine_closures_enu(loops: Sequence[Loop], by_id: dict[str, Baseline],
                        lat_rad: float, lon_rad: float,
                        h_limit: float = 1.0, v_limit: float = 2.0) -> None:
    """Recompute dh/dv/ppm/conform using a proper local ENU rotation."""
    for lp in loops:
        dN, dE, dU = loop_misclosure_enu(lp, by_id, lat_rad, lon_rad)
        lp.dh = math.hypot(dN, dE)
        lp.dv = dU
        mag = math.sqrt(dN*dN + dE*dE + dU*dU)
        lp.ppm = (mag / lp.length * 1e6) if lp.length > 0 else 0.0
        lp.conform = (abs(lp.dh) <= h_limit) and (abs(lp.dv) <= v_limit)
