import os
from typing import List, Optional
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .parser import LogParser
from .processor import LogProcessor
from .models import CategoryMagnitudeStat, SessionStat
from .services.summary_service import build_summary
from .services.ip_service import list_unique_ips
from .services.protocol_service import build_protocol_stats
from .services.flow_service import extract_target_flows

app = FastAPI(title="Network Log Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATAFRAME = None


@app.on_event("startup")
def load_default_data():
    global DATAFRAME
    # Try different relative paths to find the CSV on startup
    possible_paths = [
        "data/network_logs.csv",
        "../data/network_logs.csv",
        "backend/data/network_logs.csv",
        "../backend/data/network_logs.csv",
        "C:/Users/Acer/Downloads/POC/POC/data/network_logs.csv",
    ]
    for path in possible_paths:
        if os.path.exists(path):
            try:
                print(f"Loading default log data from {path}...")
                df = LogParser.load_csv(path)
                DATAFRAME = LogProcessor.process(df)
                print(f"Loaded {len(DATAFRAME)} records successfully.")
                break
            except Exception as e:
                print(f"Failed to load default log data from {path}: {e}")



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


def filter_dataframe(df: pd.DataFrame, target_ip: Optional[str] = None, time_range: Optional[str] = None) -> pd.DataFrame:
    filtered_df = df.copy()
    if target_ip:
        filtered_df = filtered_df[
            (filtered_df["Source IP"] == target_ip) | 
            (filtered_df["Destination IP"] == target_ip)
        ]
    if time_range and time_range != "all" and not filtered_df.empty:
        latest_time = filtered_df["Time"].max()
        if pd.notna(latest_time):
            offsets = {
                "1h": pd.Timedelta(hours=1),
                "6h": pd.Timedelta(hours=6),
                "24h": pd.Timedelta(hours=24)
            }
            offset = offsets.get(time_range)
            if offset:
                start_time = latest_time - offset
                filtered_df = filtered_df[filtered_df["Time"] >= start_time]
    return filtered_df


@app.get("/stats/category-magnitude", response_model=List[CategoryMagnitudeStat])
def get_category_magnitude(target_ip: Optional[str] = None, time_range: Optional[str] = None):
    df = require_data()
    filtered_df = filter_dataframe(df, target_ip, time_range)
    if filtered_df.empty:
        return []
    
    # Group by Low Level Category and Protocol to find the mean Magnitude
    grouped = filtered_df.groupby(["Low Level Category", "Protocol"])["Magnitude"].mean().unstack(fill_value=0)
    overall_avg = filtered_df.groupby("Low Level Category")["Magnitude"].mean()
    
    result = []
    for cat in overall_avg.index:
        tcp_val = float(grouped.loc[cat, "TCP"]) if "TCP" in grouped.columns and cat in grouped.index else 0.0
        udp_val = float(grouped.loc[cat, "UDP"]) if "UDP" in grouped.columns and cat in grouped.index else 0.0
        icmp_val = float(grouped.loc[cat, "ICMP"]) if "ICMP" in grouped.columns and cat in grouped.index else 0.0
        
        result.append(CategoryMagnitudeStat(
            category=str(cat),
            avg_magnitude=float(overall_avg[cat]),
            tcp_avg=tcp_val,
            udp_avg=udp_val,
            icmp_avg=icmp_val
        ))
        
    # Sort descending by avg magnitude
    result.sort(key=lambda x: x.avg_magnitude, reverse=True)
    return result


@app.get("/stats/session-analysis", response_model=List[SessionStat])
def get_session_analysis(target_ip: Optional[str] = None, time_range: Optional[str] = None):
    df = require_data()
    filtered_df = filter_dataframe(df, target_ip, time_range)
    if filtered_df.empty:
        return []
    
    # We want to map rows to SessionStat objects
    # Return all elements so scatter plot is complete (if too big, user can filter using UI filters)
    records = []
    for _, row in filtered_df.iterrows():
        total_bytes = float(row["Bytes Sent"] + row["Bytes Received"])
        records.append(SessionStat(
            duration=float(row["Duration Seconds"]),
            total_bytes=total_bytes,
            magnitude=float(row["Magnitude"]),
            event_count=float(row["Event Count"]),
            protocol=str(row["Protocol"]),
            event_id=str(row["Event ID"])
        ))
    return records

