"""matplotlib chart generators for the ETAFAT GNSS PDF report.

Isolated in its own module so we can import matplotlib lazily (it's
the heaviest dependency in the stack) and so unit tests can swap in a
stub renderer. Every function returns raw PNG bytes; the caller wraps
them in a ReportLab ``Image`` flowable.
"""
from __future__ import annotations

import datetime as _dt
import io
import math

from .tracking import TrackingTimeline, color_of, constellation_of

# Lazy import — keep matplotlib off the hot path when reports are skipped.
def _mpl():
    import matplotlib
    matplotlib.use("Agg")    # headless — must be set before pyplot
    import matplotlib.pyplot as plt
    return plt


def _segments(epochs: list[float], gap_factor: float = 3.0,
              min_gap_s: float = 30.0) -> list[tuple[float, float]]:
    """Collapse a list of epoch timestamps into contiguous (start, end) bars.

    Treats epochs as belonging to the same bar when the gap between them is
    below ``max(min_gap_s, gap_factor × median_gap)``. Without this the
    chart would draw one thin vertical line per epoch — visually useless
    for multi-hour sessions.
    """
    if not epochs:
        return []
    eps = sorted(epochs)
    gaps = [eps[i+1] - eps[i] for i in range(len(eps)-1)]
    if not gaps:
        return [(eps[0], eps[0] + 1.0)]
    s = sorted(gaps)
    med = s[len(s)//2]
    threshold = max(min_gap_s, gap_factor * med)
    segs: list[list[float]] = [[eps[0], eps[0]]]
    for i in range(1, len(eps)):
        if eps[i] - segs[-1][1] > threshold:
            segs.append([eps[i], eps[i]])
        else:
            segs[-1][1] = eps[i]
    return [(a, b) for a, b in segs]


def tracking_chart_png(timeline: TrackingTimeline,
                       title: str = "Tracking Summary",
                       width_in: float = 7.5,
                       sat_row_h: float = 0.22) -> bytes:
    """Render a per-satellite Gantt chart.

    Y-axis: PRN sorted by constellation (G, R, E, C, J, I, S).
    X-axis: time span of the session in UTC.
    Each bar segment reflects a contiguous tracking run. Bars are coloured
    by constellation so multi-GNSS receivers look visually distinct.
    """
    plt = _mpl()
    if not timeline.sats or timeline.first_epoch is None:
        # Placeholder for files that had no parseable epochs
        fig, ax = plt.subplots(figsize=(width_in, 1.5))
        ax.text(0.5, 0.5, "Aucune epoch observable détectée",
                ha="center", va="center", fontsize=10, color="#64748b",
                transform=ax.transAxes)
        ax.set_axis_off()
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=144, bbox_inches="tight",
                    facecolor="white")
        plt.close(fig)
        return buf.getvalue()

    # Group PRNs by constellation so the Y axis reads G*, R*, E*, C*, J*, I*, S*
    const_order = ["G", "R", "E", "C", "J", "I", "S"]
    prns = sorted(
        timeline.sats.keys(),
        key=lambda p: (const_order.index(constellation_of(p))
                       if constellation_of(p) in const_order else 99,
                       p),
    )

    n = len(prns)
    fig_h = max(2.0, n * sat_row_h + 1.2)
    fig, ax = plt.subplots(figsize=(width_in, fig_h))

    t0 = timeline.first_epoch
    t1 = max(timeline.last_epoch or t0, t0 + 1)

    for i, prn in enumerate(prns):
        y = n - i - 1     # top-down
        color = color_of(prn)
        for s, e in _segments(timeline.sats[prn]):
            ax.barh(y, max(e - s, timeline.interval_s or 1.0),
                    left=s - t0, height=0.6, color=color, alpha=0.85,
                    edgecolor=color)

    # Axes dressing
    ax.set_yticks(range(n))
    ax.set_yticklabels(list(reversed(prns)), fontsize=7)
    ax.set_ylim(-0.8, n - 0.2)

    # X axis in HH:MM UTC
    duration = t1 - t0
    n_ticks = 6
    tick_t = [t0 + duration * i / n_ticks for i in range(n_ticks + 1)]
    ax.set_xticks([t - t0 for t in tick_t])
    ax.set_xticklabels(
        [_dt.datetime.utcfromtimestamp(t).strftime("%H:%M") for t in tick_t],
        fontsize=8,
    )
    ax.set_xlabel(
        f"UTC — {_dt.datetime.utcfromtimestamp(t0).strftime('%Y-%m-%d %H:%M')} "
        f"→ {_dt.datetime.utcfromtimestamp(t1).strftime('%H:%M')}   "
        f"·  {timeline.total_epochs} epochs  ·  "
        f"Δt={timeline.interval_s:.1f} s",
        fontsize=8, color="#475569",
    )
    ax.set_title(title, fontsize=11, fontweight="bold", color="#0f172a", pad=8)
    ax.tick_params(axis="both", length=2, pad=2)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    for spine in ("bottom", "left"):
        ax.spines[spine].set_color("#e2e8f0")
    ax.grid(axis="x", linestyle=":", color="#cbd5e1", alpha=0.6)

    # Constellation legend (only for constellations actually present)
    present = sorted({constellation_of(p) for p in prns if constellation_of(p)})
    if present:
        handles = []
        labels  = {"G":"GPS","R":"GLONASS","E":"Galileo","C":"BeiDou",
                   "J":"QZSS","I":"IRNSS","S":"SBAS"}
        from matplotlib.patches import Patch
        for c in present:
            handles.append(Patch(facecolor=color_of(c + "01"), label=labels.get(c, c)))
        ax.legend(handles=handles, loc="upper right", fontsize=7,
                  frameon=False, ncol=min(len(handles), 4),
                  bbox_to_anchor=(1.0, 1.04))

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=144, bbox_inches="tight",
                facecolor="white")
    plt.close(fig)
    return buf.getvalue()
