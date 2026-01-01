# backend/mcp_server/tools/xray.py

def analyze_xray(binary_data: bytes) -> dict:
    """
    MOCK X-ray analysis.
    Replace with real vendor / ML model later.
    """
    # Simulated findings
    return {
        "detected_findings": [
            {"label": "Possible cavity", "tooth": "14", "confidence": 0.72},
            {"label": "Bone density reduction", "region": "lower molar", "confidence": 0.64}
        ],
        "summary": (
            "Automated analysis suggests possible cavity on tooth 14. "
            "Clinical confirmation required."
        )
    }
