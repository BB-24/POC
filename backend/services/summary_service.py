from typing import Dict
import pandas as pd


def build_summary(df: pd.DataFrame) -> Dict[str, object]:
    if df is None or df.empty:
        return {
            "totalLogs": 0,
            "uniqueIPs": 0,
            "totalBandwidth": 0,
            "activeConnections": 0,
            "topProtocol": None,
            "topTalker": None,
        }

    unique_ips = set(df["Source IP"].dropna().astype(str).tolist())
    unique_ips.update(df["Destination IP"].dropna().astype(str).tolist())

    total_bandwidth = int(df["Bytes Sent"].sum() + df["Bytes Received"].sum())

    connection_pairs = set()
    for _, row in df.iterrows():
        source = str(row["Source IP"])
        destination = str(row["Destination IP"])
        if source and destination and source != "nan" and destination != "nan":
            connection_pairs.add(tuple(sorted([source, destination])))

    protocol_totals = {}
    for _, row in df.iterrows():
        protocol = str(row["Protocol"]).strip()
        bytes_total = int(row["Bytes Sent"] + row["Bytes Received"])
        if protocol:
            protocol_totals[protocol] = protocol_totals.get(protocol, 0) + bytes_total

    top_protocol = max(protocol_totals, key=protocol_totals.get) if protocol_totals else None

    talker_totals = {}
    for _, row in df.iterrows():
        bytes_total = int(row["Bytes Sent"] + row["Bytes Received"])
        source = str(row["Source IP"]).strip()
        destination = str(row["Destination IP"]).strip()

        if source:
            talker_totals[source] = talker_totals.get(source, 0) + bytes_total
        if destination:
            talker_totals[destination] = talker_totals.get(destination, 0) + bytes_total

    top_talker = max(talker_totals, key=talker_totals.get) if talker_totals else None

    return {
        "totalLogs": int(len(df)),
        "uniqueIPs": int(len(unique_ips)),
        "totalBandwidth": total_bandwidth,
        "activeConnections": int(len(connection_pairs)),
        "topProtocol": top_protocol,
        "topTalker": top_talker,
    }
