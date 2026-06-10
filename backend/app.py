from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .parser import LogParser
from .processor import LogProcessor
from .services.summary_service import build_summary
from .services.ip_service import list_unique_ips
from .services.protocol_service import build_protocol_stats
from .services.flow_service import extract_target_flows

app = FastAPI(title="Network Log Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATAFRAME = None


def require_data():
    if DATAFRAME is None:
        raise HTTPException(status_code=400, detail="No log data loaded. Upload a CSV before querying.")
    return DATAFRAME


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    global DATAFRAME

    try:
        df = LogParser.load_csv(file.file)
        df = LogProcessor.process(df)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV contains no rows.")

    DATAFRAME = df

    return {
        "records": len(df),
        "message": "Upload successful. Dataset indexed in memory.",
    }


@app.get("/summary")
def summary():
    df = require_data()
    return build_summary(df)


@app.get("/ips")
def ips():
    df = require_data()
    return list_unique_ips(df)


@app.get("/protocols")
def protocols():
    df = require_data()
    return build_protocol_stats(df)


@app.get("/flows/{target_ip}")
def flows(target_ip: str):
    df = require_data()
    return extract_target_flows(df, target_ip)


@app.get("/logs")
def logs(page: int = 1, limit: int = 100):
    df = require_data()

    if page < 1:
        raise HTTPException(status_code=400, detail="Page parameter must be 1 or greater.")
    if limit < 1 or limit > 1000:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000.")

    start = (page - 1) * limit
    end = start + limit
    page_df = df.iloc[start:end]

    return {
        "total": len(df),
        "page": page,
        "limit": limit,
        "records": page_df.to_dict(orient="records"),
    }
