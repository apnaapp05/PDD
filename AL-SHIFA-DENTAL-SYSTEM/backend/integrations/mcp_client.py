# backend/integrations/mcp_client.py

import requests

MCP_XRAY_URL = "http://localhost:9000/xray/analyze"

def send_xray_for_analysis(file_path: str) -> dict:
    with open(file_path, "rb") as f:
        files = {"file": f}
        response = requests.post(MCP_XRAY_URL, files=files, timeout=10)
        response.raise_for_status()
        return response.json()
