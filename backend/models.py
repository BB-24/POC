from typing import Optional
from pydantic import BaseModel


class SummaryResponse(BaseModel):
    totalLogs: int
    uniqueIPs: int
    totalBandwidth: int
    activeConnections: int
    topProtocol: Optional[str]
    topTalker: Optional[str]


class ProtocolStat(BaseModel):
    Protocol: str
    events: int
    bytes_total: float


class FlowRecord(BaseModel):
    Time: str
    Source_IP: str
    Destination_IP: str
    Protocol: str
    Bytes_Sent: float
    Bytes_Received: float
    Duration_Seconds: float
    bytes_total: float
    remote: str
    direction: str


class LogRecord(BaseModel):
    Event_ID: int
    Event_Name: str
    Log_Source: str
    Event_Count: int
    Time: str
    Low_Level_Category: str
    Source_IP: str
    Source_Port: int
    Destination_IP: str
    Destination_Port: int
    Protocol: str
    Magnitude: int
    Bytes_Sent: float
    Bytes_Received: float
    Duration_Seconds: float


class CategoryMagnitude(BaseModel):
    category: str
    magnitude: float


class ScatterDataPoint(BaseModel):
    duration: float
    total_bytes: float
    event_count: int
    magnitude: int
