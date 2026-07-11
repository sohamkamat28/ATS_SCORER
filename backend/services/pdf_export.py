import io

from bs4 import BeautifulSoup
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer


def generate_combined_pdf(html_docs: dict[str, str]) -> bytes:
    """Render report HTML as a portable PDF without native system libraries."""
    output = io.BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="ResumeLens ATS Report",
    )
    styles = getSampleStyleSheet()
    styles["Title"].textColor = colors.HexColor("#006D66")
    story = []

    for index, (name, html) in enumerate(html_docs.items()):
        if index:
            story.append(PageBreak())
        story.append(Paragraph(name.replace("_", " ").title(), styles["Title"]))
        story.append(Spacer(1, 6 * mm))
        soup = BeautifulSoup(html, "html.parser")
        for element in soup.find_all(["h1", "h2", "h3", "p", "li"]):
            value = element.get_text(" ", strip=True)
            if not value:
                continue
            style = styles["Heading2"] if element.name in {"h1", "h2", "h3"} else styles["BodyText"]
            story.append(Paragraph(value, style))
            story.append(Spacer(1, 2.2 * mm))

    document.build(story)
    return output.getvalue()
