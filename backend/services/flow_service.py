from typing import List, Dict
import numpy as np
import pandas as pd


def extract_target_flows(df: pd.DataFrame, target_ip: str) -> List[Dict[str, object]]:
    if df is None or df.empty:
        return []

    target_ip = str(target_ip)
    subset = df[(df["Source IP"] == target_ip) | (df["Destination IP"] == target_ip)].copy()
    if subset.empty:
        return []

    subset["remote"] = np.where(
        subset["Source IP"] == target_ip,
        subset["Destination IP"],
        subset["Source IP"],
    )
    subset["direction"] = np.where(
        subset["Source IP"] == target_ip,
        "outbound",
        "inbound",
    )
    subset["bytes_total"] = subset["Bytes Sent"] + subset["Bytes Received"]
    subset = subset.sort_values("Time")
    subset["Time"] = subset["Time"].dt.strftime("%Y-%m-%dT%H:%M:%S")

    return subset[
        [
            "Time",
            "Source IP",
            "Destination IP",
            "Protocol",
            "Bytes Sent",
            "Bytes Received",
            "Duration Seconds",
            "bytes_total",
            "remote",
            "direction",
        ]
    ].to_dict(orient="records")
