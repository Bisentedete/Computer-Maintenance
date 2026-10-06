from datetime import datetime, timezone
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, KeepTogether
from reportlab.graphics.shapes import Drawing, String
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.legends import Legend

BLUE = colors.HexColor("#1E40AF")
AMBER = colors.HexColor("#D97706")
TEXT = colors.HexColor("#111827")
MUTED = colors.HexColor("#6B7280")
BORDER = colors.HexColor("#E5E7EB")
ZEBRA = colors.HexColor("#F9FAFB")

styles = getSampleStyleSheet()
H1 = ParagraphStyle("h1", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=16, textColor=TEXT, alignment=TA_LEFT, spaceAfter=2)
SUB = ParagraphStyle("sub", parent=styles["Normal"], fontName="Helvetica", fontSize=9, textColor=MUTED, leading=12)
H2 = ParagraphStyle("h2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11, textColor=TEXT, spaceBefore=10, spaceAfter=4)
BODY = ParagraphStyle("body", parent=styles["Normal"], fontName="Helvetica", fontSize=9, textColor=TEXT, leading=12)
SMALL = ParagraphStyle("small", parent=BODY, fontSize=8, textColor=MUTED)


def _table(rows, col_widths, align_right_from=None):
    t = Table(rows, colWidths=col_widths, repeatRows=1)
    style = [
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 0), (-1, 0), MUTED),
        ("LINEBELOW", (0, 0), (-1, 0), 0.75, BORDER),
        ("LINEBELOW", (0, 1), (-1, -1), 0.25, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ZEBRA]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    if align_right_from is not None:
        style.append(("ALIGN", (align_right_from, 0), (-1, -1), "RIGHT"))
    t.setStyle(TableStyle(style))
    return t


def _stat_grid(stats):
    cells = [
        ("Total Computers", stats["total_computers"]), ("Operational", stats["operational"]),
        ("Under Maintenance", stats["under_maintenance"]), ("Reported Problems", stats["reported_problems"]),
        ("Total Requests", stats["total_reports"]), ("Resolved", stats["resolved_reports"]),
        ("Pending", stats["pending_reports"]), ("In Progress", stats["in_progress_reports"]),
    ]
    rows = []
    for i in range(0, 8, 4):
        rows.append([Paragraph(f'<font size="7" color="#6B7280">{l.upper()}</font><br/><font size="14"><b>{v}</b></font>', BODY) for l, v in cells[i:i + 4]])
    t = Table(rows, colWidths=[42 * mm] * 4, rowHeights=[16 * mm] * 2)
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def _lab_chart(labs):
    with_data = [l for l in labs if l["avg_cpu"] is not None]
    if not with_data:
        return Paragraph("No agent samples in the last 24 hours.", SMALL)
    d = Drawing(170 * mm, 60 * mm)
    bc = VerticalBarChart()
    bc.x, bc.y, bc.width, bc.height = 10 * mm, 8 * mm, 120 * mm, 46 * mm
    bc.data = [[l["avg_cpu"] for l in with_data], [l["avg_ram"] for l in with_data]]
    bc.categoryAxis.categoryNames = [l["laboratory"] for l in with_data]
    bc.categoryAxis.labels.fontName = "Helvetica"
    bc.categoryAxis.labels.fontSize = 7.5
    bc.valueAxis.valueMin, bc.valueAxis.valueMax, bc.valueAxis.valueStep = 0, 100, 25
    bc.valueAxis.labels.fontSize = 7.5
    bc.valueAxis.labelTextFormat = "%d%%"
    bc.valueAxis.strokeColor = BORDER
    bc.categoryAxis.strokeColor = BORDER
    bc.bars[0].fillColor, bc.bars[1].fillColor = BLUE, AMBER
    bc.bars.strokeColor = None
    bc.barLabelFormat = "%d%%"
    bc.barLabels.fontSize = 7
    bc.barLabels.nudge = 6
    bc.groupSpacing = 12
    d.add(bc)
    lg = Legend()
    lg.x, lg.y = 140 * mm, 45 * mm
    lg.fontName, lg.fontSize = "Helvetica", 8
    lg.colorNamePairs = [(BLUE, "Avg CPU"), (AMBER, "Avg RAM")]
    lg.alignment = "right"
    d.add(lg)
    return d


def build_report(stats: dict, labs: list, alerts: list, generated_by: str) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
                            title="CLMS Maintenance Report", author=generated_by)
    now = datetime.now(timezone.utc).strftime("%B %d, %Y %H:%M UTC")
    story = [
        Paragraph("Computer Laboratory Maintenance System", H1),
        Paragraph(f"Maintenance &amp; Monitoring Report &nbsp;·&nbsp; Generated {now} &nbsp;·&nbsp; Prepared by {generated_by}", SUB),
        Spacer(1, 8),
        Paragraph("Summary", H2),
        _stat_grid(stats),
        Paragraph("Lab Usage Comparison (last 24 hours)", H2),
        _lab_chart(labs),
        _table(
            [["Laboratory", "Monitored PCs", "Samples", "Avg CPU", "Peak CPU", "Avg RAM", "Peak RAM"]] + [[
                l["laboratory"], f'{l["monitored_computers"]}/{l["total_computers"]}', l["samples"],
                f'{l["avg_cpu"]}%' if l["avg_cpu"] is not None else "—", f'{l["peak_cpu"]}%' if l["peak_cpu"] is not None else "—",
                f'{l["avg_ram"]}%' if l["avg_ram"] is not None else "—", f'{l["peak_ram"]}%' if l["peak_ram"] is not None else "—",
            ] for l in labs],
            [40 * mm, 26 * mm, 20 * mm, 20 * mm, 22 * mm, 20 * mm, 22 * mm], align_right_from=1,
        ),
    ]

    problems = stats["common_problems"] or []
    top_pcs = stats["top_maintenance_computers"] or []
    two_col = Table([[
        [Paragraph("Most Common Problem Types", H2),
         _table([["Problem Type", "Count"]] + [[p["name"], p["count"]] for p in problems], [62 * mm, 18 * mm], 1) if problems else Paragraph("No data.", SMALL)],
        [Paragraph("Computers With Most Maintenance", H2),
         _table([["Computer", "Records"]] + [[p["computer_id"], p["count"]] for p in top_pcs], [62 * mm, 18 * mm], 1) if top_pcs else Paragraph("No data.", SMALL)],
    ]], colWidths=[87 * mm, 87 * mm])
    two_col.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6)]))
    story.append(two_col)

    story.append(Paragraph(f"Active Alerts ({len(alerts)})", H2))
    if alerts:
        label = {"offline": "Offline", "high_cpu": "High CPU", "high_ram": "High RAM"}
        rows = [["Computer", "Type", "Laboratory", "Started", "Details"]]
        for a in alerts:
            started = datetime.fromisoformat(a["started_at"]).strftime("%b %d, %H:%M")
            details = (f'last heartbeat {datetime.fromisoformat(a["last_heartbeat_at"]).strftime("%H:%M")}' if a["type"] == "offline"
                       else f'now {a.get("value")}% · peak {a.get("peak")}%')
            rows.append([a["computer_id"], label.get(a["type"], a["type"]), a.get("laboratory") or "—", started, details])
        story.append(_table(rows, [26 * mm, 24 * mm, 36 * mm, 30 * mm, 54 * mm]))
    else:
        story.append(Paragraph("No active alerts. All monitored computers are healthy.", SMALL))

    def footer(canvas, d):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(18 * mm, 10 * mm, "CLMS · Computer Laboratory Maintenance System")
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Page {d.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buf.getvalue()
