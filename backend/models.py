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
