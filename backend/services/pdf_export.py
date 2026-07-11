import html
import io
import re
import unicodedata
from datetime import datetime
from typing import Any, Dict, Iterable, List

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


INK = colors.HexColor("#142033")
MUTED = colors.HexColor("#66758D")
LINE = colors.HexColor("#DCE5EA")
TEAL = colors.HexColor("#006D66")
TEAL_DARK = colors.HexColor("#00564F")
TEAL_SOFT = colors.HexColor("#EAF6F3")
BLUE_SOFT = colors.HexColor("#EEF5FA")
RED = colors.HexColor("#B83A35")
RED_SOFT = colors.HexColor("#FDEDEC")
AMBER = colors.HexColor("#A66A13")
AMBER_SOFT = colors.HexColor("#FFF4DD")
INDIGO = colors.HexColor("#4E5FA8")
INDIGO_SOFT = colors.HexColor("#EEF0FF")
WHITE = colors.white


def _plain(value: Any) -> str:
    text = str(value or "")
    replacements = {
        "\u2013": "-", "\u2014": "-", "\u2011": "-", "\u2022": "-",
        "\u2192": "->", "\u2713": "", "\u00a0": " ",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii").strip()


def _safe(value: Any) -> str:
    return html.escape(_plain(value)).replace("\n", "<br/>")


def _styles() -> Dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("Title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=25, leading=29, textColor=INK, alignment=TA_LEFT, spaceAfter=8),
        "subtitle": ParagraphStyle("Subtitle", parent=base["BodyText"], fontName="Helvetica", fontSize=10, leading=15, textColor=MUTED),
        "kicker": ParagraphStyle("Kicker", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=TEAL, tracking=1.4, spaceAfter=5),
        "section": ParagraphStyle("Section", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=16, leading=19, textColor=INK, spaceAfter=4),
        "section_copy": ParagraphStyle("SectionCopy", parent=base["BodyText"], fontName="Helvetica", fontSize=8.5, leading=12, textColor=MUTED),
        "body": ParagraphStyle("Body", parent=base["BodyText"], fontName="Helvetica", fontSize=9.2, leading=14, textColor=colors.HexColor("#3F4E63")),
        "body_small": ParagraphStyle("BodySmall", parent=base["BodyText"], fontName="Helvetica", fontSize=8, leading=11.5, textColor=MUTED),
        "label": ParagraphStyle("Label", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=7.2, leading=9, textColor=MUTED, tracking=.8),
        "metric": ParagraphStyle("Metric", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=20, leading=22, textColor=INK, alignment=TA_CENTER),
        "metric_label": ParagraphStyle("MetricLabel", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=6.8, leading=9, textColor=MUTED, alignment=TA_CENTER, tracking=.6),
        "card_title": ParagraphStyle("CardTitle", parent=base["Heading3"], fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=INK),
        "fix": ParagraphStyle("Fix", parent=base["BodyText"], fontName="Helvetica", fontSize=8.6, leading=13, textColor=colors.HexColor("#245D4E")),
        "mono": ParagraphStyle("Mono", parent=base["Code"], fontName="Courier", fontSize=7.5, leading=11, textColor=colors.HexColor("#344054")),
    }


class ProgressBar(Flowable):
    def __init__(self, percentage: float, width: float = 175, height: float = 6):
        super().__init__()
        self.percentage = max(0, min(100, percentage))
        self.width = width
        self.height = height

    def draw(self):
        self.canv.setFillColor(colors.HexColor("#E8EFF1"))
        self.canv.roundRect(0, 0, self.width, self.height, 3, fill=1, stroke=0)
        if self.percentage:
            self.canv.setFillColor(TEAL if self.percentage >= 72 else AMBER if self.percentage >= 50 else RED)
            self.canv.roundRect(0, 0, self.width * self.percentage / 100, self.height, 3, fill=1, stroke=0)


def _page_frame(canvas, document):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(.7)
    canvas.line(document.leftMargin, height - 15 * mm, width - document.rightMargin, height - 15 * mm)
    canvas.setFont("Helvetica-Bold", 7)
    canvas.setFillColor(TEAL)
    canvas.drawString(document.leftMargin, height - 11.5 * mm, "RESUMELENS  /  ATS REPORT")
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(width - document.rightMargin, height - 11.5 * mm, datetime.now().strftime("%d %b %Y"))
    canvas.line(document.leftMargin, 13 * mm, width - document.rightMargin, 13 * mm)
    canvas.drawString(document.leftMargin, 9 * mm, "Evidence-based resume analysis")
    canvas.drawRightString(width - document.rightMargin, 9 * mm, f"Page {document.page}")
    canvas.restoreState()


def _section(index: str, title: str, copy: str, styles: Dict[str, ParagraphStyle]):
    marker = Table([[Paragraph(index, styles["label"])]], colWidths=[10 * mm], rowHeights=[10 * mm])
    marker.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), TEAL_SOFT),
        ("TEXTCOLOR", (0, 0), (-1, -1), TEAL),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), .5, colors.HexColor("#CBE3DE")),
    ]))
    heading = Table([[marker, [Paragraph(_safe(title), styles["section"]), Paragraph(_safe(copy), styles["section_copy"])]]], colWidths=[13 * mm, 155 * mm])
    heading.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 4), ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    return [heading, Spacer(1, 6 * mm)]


def _metric(value: Any, label: str, styles, background=BLUE_SOFT):
    table = Table([[Paragraph(_safe(value), styles["metric"])], [Paragraph(_safe(label).upper(), styles["metric_label"])]], colWidths=[52 * mm], rowHeights=[10 * mm, 7 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), .6, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return table


def _keyword_table(values: Iterable[Any], styles, background, text_color, columns=3):
    cleaned = [_plain(value) for value in values if _plain(value)]
    if not cleaned:
        return Paragraph("No items detected.", styles["body_small"])
    rows = []
    for offset in range(0, len(cleaned), columns):
        row = [Paragraph(_safe(item), ParagraphStyle("Pill", parent=styles["body_small"], fontName="Helvetica-Bold", textColor=text_color, leading=10)) for item in cleaned[offset:offset + columns]]
        row.extend([""] * (columns - len(row)))
        rows.append(row)
    table = Table(rows, colWidths=[168 * mm / columns] * columns, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), .5, WHITE),
        ("INNERGRID", (0, 0), (-1, -1), 2, WHITE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def _feedback_dict(item: Any) -> Dict[str, Any]:
    if isinstance(item, dict):
        return item
    if hasattr(item, "model_dump"):
        return item.model_dump()
    return getattr(item, "__dict__", {})


def generate_analysis_pdf(analysis: Dict[str, Any]) -> bytes:
    output = io.BytesIO()
    styles = _styles()
    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=21 * mm,
        leftMargin=21 * mm,
        topMargin=21 * mm,
        bottomMargin=19 * mm,
        title="ResumeLens ATS Report",
        author="ResumeLens",
    )
    story: List[Any] = []
    score = float(analysis.get("ATS_score") or analysis.get("ats_score") or 0)
    interpretation = analysis.get("interpretation") or (
        "Strong foundation. Prioritize the remaining recommendations before applying."
        if score >= 80 else "Competitive with focused edits. Address high-impact issues first."
        if score >= 60 else "Needs focused revision. Work through the recommendations before applying."
    )
    feedback = [_feedback_dict(item) for item in analysis.get("detailed_feedback", [])]
    validation = analysis.get("skill_validation_details") or {}
    jd = analysis.get("jd_match_analysis") or analysis.get("jd_comparison") or {}

    score_block = Table([
        [Paragraph("OVERALL ATS SCORE", ParagraphStyle("ScoreLabel", parent=styles["label"], textColor=colors.HexColor("#A7DDD7"), alignment=TA_CENTER))],
        [Paragraph(f"<font size='34'><b>{score:.0f}</b></font><font size='12'> / 100</font>", ParagraphStyle("Score", parent=styles["body"], textColor=WHITE, alignment=TA_CENTER, leading=38))],
    ], colWidths=[45 * mm], rowHeights=[9 * mm, 18 * mm])
    score_block.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), TEAL_DARK), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    summary_copy = [Paragraph("ATS RESUME ANALYSIS", ParagraphStyle("WhiteKicker", parent=styles["kicker"], textColor=colors.HexColor("#9DDDD7"))), Paragraph("Resume readiness report", ParagraphStyle("WhiteTitle", parent=styles["title"], textColor=WHITE, fontSize=22, leading=25)), Paragraph(_safe(interpretation), ParagraphStyle("WhiteBody", parent=styles["body"], textColor=colors.HexColor("#D8EFEC"), fontSize=9, leading=13))]
    overview = Table([[score_block, summary_copy]], colWidths=[50 * mm, 118 * mm], rowHeights=[42 * mm])
    overview.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), TEAL), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (0, 0), 3 * mm), ("RIGHTPADDING", (0, 0), (0, 0), 3 * mm), ("LEFTPADDING", (1, 0), (1, 0), 8 * mm), ("RIGHTPADDING", (1, 0), (1, 0), 8 * mm), ("TOPPADDING", (0, 0), (-1, -1), 5 * mm), ("BOTTOMPADDING", (0, 0), (-1, -1), 5 * mm)]))
    story.extend([Spacer(1, 2 * mm), overview, Spacer(1, 9 * mm)])
    story.extend(_section("01", "Score breakdown", "Five signals that make up the overall ATS readiness score.", styles))

    components = analysis.get("component_scores") or {}
    if hasattr(components, "model_dump"):
        components = components.model_dump()
    score_rows = [
        ("Formatting", "Structure, section headers, and readable layout", components.get("formatting", 0), 20),
        ("Keywords and skills", "Role language and relevant terminology", components.get("keywords", 0), 25),
        ("Content quality", "Actions, outcomes, and measurable work", components.get("content", 0), 25),
        ("Skill validation", "Claims supported by project or work evidence", components.get("skill_validation", 0), 15),
        ("ATS compatibility", "Parsing safety and conventional formatting", components.get("ats_compatibility", 0), 15),
    ]
    rows = []
    for label, description, value, maximum in score_rows:
        percentage = float(value) / maximum * 100 if maximum else 0
        rows.append([Paragraph(f"<b>{_safe(label)}</b><br/><font color='#7C8CA4' size='7'>{_safe(description)}</font>", styles["body_small"]), ProgressBar(percentage), Paragraph(f"<b>{float(value):.0f}</b><font size='7' color='#8997AA'>/{maximum}</font>", styles["body_small"])])
    score_table = Table(rows, colWidths=[64 * mm, 77 * mm, 20 * mm], rowHeights=[15 * mm] * len(rows))
    score_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LINEABOVE", (0, 1), (-1, -1), .5, LINE), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 4), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    story.extend([score_table, Spacer(1, 8 * mm)])

    strengths = analysis.get("strengths") or []
    if not strengths:
        strengths = [f"{label} is performing above the target benchmark" for label, _, value, maximum in score_rows if float(value) / maximum >= .72]
    story.extend(_section("02", "What is working", "Signals already helping the resume pass automated and recruiter review.", styles))
    if strengths:
        strength_rows = [[Paragraph(f"<font color='#006D66'><b>+</b></font>&nbsp;&nbsp;{_safe(item)}", styles["body"])] for item in strengths]
        strength_table = Table(strength_rows, colWidths=[168 * mm])
        strength_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), TEAL_SOFT), ("INNERGRID", (0, 0), (-1, -1), 2, WHITE), ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
        story.append(strength_table)
    else:
        story.append(Paragraph("No strong signals were detected yet. Use the recommendations to build them.", styles["body"]))

    story.extend([PageBreak(), *_section("03", "Skill evidence", "Skills cross-checked against projects and experience entries.", styles)])
    validated = validation.get("validated", [])
    unvalidated = validation.get("unvalidated", [])
    total = validation.get("total", len(validated) + len(unvalidated))
    metric_row = Table([[
        _metric(total, "Total skills", styles),
        _metric(validation.get("validated_count", len(validated)), "Validated", styles, TEAL_SOFT),
        _metric(len(unvalidated), "Need evidence", styles, RED_SOFT),
    ]], colWidths=[56 * mm] * 3)
    metric_row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2)]))
    story.extend([metric_row, Spacer(1, 7 * mm)])
    if validated:
        story.append(Paragraph("VALIDATED SKILLS", styles["kicker"]))
        skill_rows = []
        for item in validated:
            projects = ", ".join(_plain(project) for project in item.get("projects", [])[:4]) or "Evidence found in resume"
            skill_rows.append([Paragraph(f"<b>{_safe(item.get('skill'))}</b>", styles["body"]), Paragraph(_safe(projects), styles["body_small"])])
        table = Table(skill_rows, colWidths=[45 * mm, 123 * mm])
        table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), TEAL_SOFT), ("INNERGRID", (0, 0), (-1, -1), 2, WHITE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
        story.extend([table, Spacer(1, 7 * mm)])
    if unvalidated:
        story.extend([Paragraph("SKILLS THAT NEED SUPPORTING CONTEXT", styles["kicker"]), _keyword_table(unvalidated, styles, RED_SOFT, RED), Spacer(1, 4 * mm), Paragraph("Mention each skill naturally in a project or experience bullet and describe how it was used.", styles["body_small"])])

    if jd:
        story.extend([PageBreak(), *_section("04", "Role match", "Resume language compared with the supplied job description.", styles)])
        match = float(jd.get("match_percentage", 0))
        semantic = float(jd.get("semantic_similarity", 0)) * 100
        role_metrics = Table([[_metric(f"{match:.0f}%", "Overall match", styles, TEAL_SOFT), _metric(f"{semantic:.0f}%", "Semantic similarity", styles)]], colWidths=[84 * mm] * 2)
        role_metrics.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2)]))
        story.extend([role_metrics, Spacer(1, 7 * mm)])
        for label, values, background, text_color in [
            ("MATCHED KEYWORDS", jd.get("matched_keywords", []), TEAL_SOFT, TEAL_DARK),
            ("MISSING KEYWORDS", jd.get("missing_keywords", []), RED_SOFT, RED),
            ("SKILLS GAP", jd.get("skills_gap", []), AMBER_SOFT, AMBER),
        ]:
            if values:
                story.extend([Paragraph(label, styles["kicker"]), _keyword_table(values, styles, background, text_color), Spacer(1, 6 * mm)])

    recommendation_index = "05" if jd else "04"
    story.extend([PageBreak(), *_section(recommendation_index, "Recommendations", "Every detected issue with context, action steps, and examples.", styles)])
    if not feedback:
        story.append(Table([[Paragraph("<b>No major issues detected.</b><br/>Keep the resume tailored to each role and rescan after meaningful edits.", styles["body"])]], colWidths=[168 * mm], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), TEAL_SOFT), ("BOX", (0, 0), (-1, -1), .5, colors.HexColor("#CBE3DE")), ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12), ("TOPPADDING", (0, 0), (-1, -1), 12), ("BOTTOMPADDING", (0, 0), (-1, -1), 12)])))
    for index, issue in enumerate(feedback, 1):
        severity = _plain(issue.get("severity_level") or "Low").lower()
        if severity == "high":
            badge_color, badge_bg, border = RED, RED_SOFT, RED
        elif severity in {"moderate", "medium"}:
            badge_color, badge_bg, border = AMBER, AMBER_SOFT, AMBER
        else:
            badge_color, badge_bg, border = INDIGO, INDIGO_SOFT, INDIGO
        badge = Paragraph(f"<font color='{badge_color.hexval()}'><b>{_safe(severity.upper())}</b></font>", styles["label"])
        heading = Paragraph(f"<font size='7' color='#98A2B3'>RECOMMENDATION {index:02d}</font><br/><b>{_safe(issue.get('issue_title'))}</b>", styles["card_title"])
        header = Table([[badge, heading]], colWidths=[25 * mm, 143 * mm])
        header.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, 0), badge_bg), ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#FAFCFD")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8), ("LINEBELOW", (0, 0), (-1, -1), .5, LINE)]))
        body: List[Any] = [header, Spacer(1, 3 * mm), Paragraph(_safe(issue.get("explanation")), styles["body"]), Spacer(1, 3 * mm)]
        meta = []
        if issue.get("ats_impact"):
            meta.append(Paragraph(f"<font size='7' color='#98A2B3'><b>ATS IMPACT</b></font><br/>{_safe(issue.get('ats_impact'))}", styles["body_small"]))
        if issue.get("where_it_appears"):
            meta.append(Paragraph(f"<font size='7' color='#98A2B3'><b>WHERE IT APPEARS</b></font><br/>{_safe(issue.get('where_it_appears'))}", styles["body_small"]))
        if meta:
            meta.extend([""] * (2 - len(meta)))
            meta_table = Table([meta], colWidths=[81 * mm, 81 * mm])
            meta_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), BLUE_SOFT), ("INNERGRID", (0, 0), (-1, -1), 2, WHITE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
            body.extend([meta_table, Spacer(1, 3 * mm)])
        if issue.get("how_to_fix"):
            fix_table = Table([[Paragraph(f"<b>HOW TO FIX</b><br/>{_safe(issue.get('how_to_fix'))}", styles["fix"])]], colWidths=[162 * mm])
            fix_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), TEAL_SOFT), ("BOX", (0, 0), (-1, -1), .5, colors.HexColor("#CBE3DE")), ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
            body.extend([fix_table, Spacer(1, 3 * mm)])
        actions = issue.get("action_items") or []
        if actions:
            body.append(Paragraph("ACTION CHECKLIST", styles["kicker"]))
            for action in actions:
                body.append(Paragraph(f"[  ]  {_safe(action)}", styles["body_small"]))
                body.append(Spacer(1, 1.2 * mm))
        if issue.get("example_improvement"):
            body.extend([Spacer(1, 2 * mm), Paragraph("EXAMPLE IMPROVEMENT", styles["kicker"]), Table([[Paragraph(_safe(issue.get("example_improvement")), styles["mono"])]], colWidths=[162 * mm], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F3F6F8")), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))])
        card = Table([[body]], colWidths=[168 * mm])
        card.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), .8, border), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
        story.extend([card, Spacer(1, 5 * mm)])

    document.build(story, onFirstPage=_page_frame, onLaterPages=_page_frame)
    return output.getvalue()


def generate_combined_pdf(html_docs: Dict[str, str]) -> bytes:
    """Compatibility path for callers that still supply rendered HTML sections."""
    text_sections = []
    for name, markup in html_docs.items():
        text = re.sub(r"<[^>]+>", " ", markup)
        text = re.sub(r"\s+", " ", html.unescape(text)).strip()
        text_sections.append({"issue_title": name.replace("_", " ").title(), "severity_level": "info", "explanation": text[:5000], "ats_impact": "", "where_it_appears": "", "how_to_fix": "", "action_items": [], "example_improvement": ""})
    return generate_analysis_pdf({"ATS_score": 0, "ats_score": 0, "component_scores": {}, "detailed_feedback": text_sections})
