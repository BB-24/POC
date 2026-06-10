from typing import List, Dict
import pandas as pd


def build_protocol_stats(df: pd.DataFrame) -> List[Dict[str, object]]:
    if df is None or df.empty:
        return []

    dataset = df.copy()
    dataset["bytes_total"] = dataset["Bytes Sent"] + dataset["Bytes Received"]

    summary = (
        dataset
        .groupby("Protocol", sort=False)
        .agg(events=("Protocol", "size"), bytes_total=("bytes_total", "sum"))
        .reset_index()
        .sort_values("bytes_total", ascending=False)
    )

    return summary.to_dict(orient="records")
