# backend/mcp_server/app.py

from fastapi import FastAPI, UploadFile, File
from mcp_server.tools.xray import analyze_xray

app = FastAPI(title="MCP X-Ray Server")

@app.post("/xray/analyze")
async def analyze(file: UploadFile = File(...)):
    """
    MCP endpoint: Analyze dental X-ray.
    Returns tags + notes (doctor verification required).
    """
    content = await file.read()
    result = analyze_xray(content)
    return {
        "status": "success",
        "analysis": result,
        "requires_doctor_verification": True
    }
