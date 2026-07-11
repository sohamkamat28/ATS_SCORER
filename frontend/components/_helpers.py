from typing import Tuple


def get_score_color(score: float) -> Tuple[str, str]:
    """Return (text_color, background_color) for a 0–100 score."""
    if score >= 80:
        return "#067647", "#ECFDF3"
    if score >= 60:
        return "#B54708", "#FFFAEB"
    return "#B42318", "#FEF3F2"


def get_score_label(score: float) -> str:
    """Short label that matches the score band."""
    if score >= 90:
        return "Excellent"
    if score >= 80:
        return "Strong"
    if score >= 70:
        return "Good"
    if score >= 60:
        return "Needs polish"
    return "High risk"


def get_severity_style(severity: str) -> Tuple[str, str, str]:
    """
    Return (label, text_color, background_color) for an IssueDetail severity.
    Matches the values the backend emits in `detailed_feedback[].severity_level`.
    """
    level = (severity or "").lower()
    if level in ("critical", "high"):
        return "High", "#B42318", "#FEF3F2"
    if level == "medium":
        return "Medium", "#B54708", "#FFFAEB"
    return "Low", "#067647", "#ECFDF3"
