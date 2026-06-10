from typing import List
import pandas as pd


def list_unique_ips(df: pd.DataFrame) -> List[str]:
    if df is None or df.empty:
        return []

    source_ips = df["Source IP"].dropna().astype(str).tolist()
    destination_ips = df["Destination IP"].dropna().astype(str).tolist()
    unique_ips = sorted({ip for ip in source_ips + destination_ips if ip})
    return unique_ips
