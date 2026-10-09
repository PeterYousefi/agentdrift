from fastapi import FastAPI

app = FastAPI(title="AgentDrift", version="0.1.0", description="Synthetic metadata investigation API")


@app.get("/health")
def health():
    return {"status": "ok", "synthetic_only": True}


@app.get("/ready")
def ready():
    return {"status": "ready", "pipeline": "foundation"}
