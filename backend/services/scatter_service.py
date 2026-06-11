import pandas as pd


def build_scatter_data(df):
    """
    Builds scatter plot data: Duration (X) vs Total Bytes (Y).
    Bubble size based on Event Count or Magnitude.
    
    Returns a list of data points with:
    - duration: Duration Seconds
    - total_bytes: Bytes Sent + Bytes Received
    - event_count: Event Count
    - magnitude: Magnitude (for color/size coding)
    """
    if df.empty:
        return []

    result = df[["Duration Seconds", "Bytes Sent", "Bytes Received", "Event Count", "Magnitude"]].copy()
    result["total_bytes"] = result["Bytes Sent"] + result["Bytes Received"]
    result["duration"] = result["Duration Seconds"]
    result["event_count"] = result["Event Count"]
    result["magnitude"] = result["Magnitude"]

    # Filter out zero-duration records to avoid visualization issues
    result = result[result["duration"] > 0]

    return result[["duration", "total_bytes", "event_count", "magnitude"]].to_dict(orient="records")
