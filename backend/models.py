from typing import Optional, List, Dict
from pydantic import BaseModel, Field


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
    Event_ID: str = Field(..., alias="Event ID")
    Event_Name: str = Field(..., alias="Event Name")
    Log_Source: str = Field(..., alias="Log Source")
    Event_Count: float = Field(..., alias="Event Count")
    Time: str
    Low_Level_Category: str = Field(..., alias="Low Level Category")
    Source_IP: str = Field(..., alias="Source IP")
    Source_Port: float = Field(..., alias="Source Port")
    Destination_IP: str = Field(..., alias="Destination IP")
    Destination_Port: float = Field(..., alias="Destination Port")
    Protocol: str
    Magnitude: float
    Bytes_Sent: float = Field(..., alias="Bytes Sent")
    Bytes_Received: float = Field(..., alias="Bytes Received")
    Duration_Seconds: float = Field(..., alias="Duration Seconds")
    bytes_total: float
    remote: str
    direction: str

    class Config:
        populate_by_name = True


class CategoryMagnitudeStat(BaseModel):
    category: str
    avg_magnitude: float
    tcp_avg: float
    udp_avg: float
    icmp_avg: float


class SessionStat(BaseModel):
    duration: float
    total_bytes: float
    magnitude: float
    event_count: float
    protocol: str
    event_id: str

