import math


class Aggregator:

    @staticmethod
    def summary(df):

        unique_ips = set()

        unique_ips.update(
            df["Source IP"].dropna().tolist()
        )

        unique_ips.update(
            df["Destination IP"].dropna().tolist()
        )

        total_bandwidth = (
            df["Bytes Sent"].sum()
            +
            df["Bytes Received"].sum()
        )

        talkers = {}

        for _, row in df.iterrows():

            remote = row["Destination IP"]

            bytes_total = (
                row["Bytes Sent"]
                +
                row["Bytes Received"]
            )

            talkers[remote] = (
                talkers.get(remote, 0)
                + bytes_total
            )

        top_talker = None

        if talkers:
            top_talker = max(
                talkers,
                key=talkers.get
            )

        return {

            "total_logs": len(df),

            "unique_ips": len(unique_ips),

            "bandwidth": int(total_bandwidth),

            "top_talker": top_talker
        }


def build_flow_events(df, target_ip):

    events = []

    for _, row in df.iterrows():

        source = row["Source IP"]
        dest = row["Destination IP"]

        if target_ip not in [source, dest]:
            continue

        bytes_total = (
            row["Bytes Sent"]
            +
            row["Bytes Received"]
        )

        remote = (
            dest
            if source == target_ip
            else source
        )

        events.append({

            "time":
                row["Time"].isoformat(),

            "remote":
                remote,

            "protocol":
                row["Protocol"],

            "bytes":
                int(bytes_total),

            "thickness":
                min(
                    12,
                    max(
                        1,
                        math.log10(
                            max(bytes_total, 10)
                        )
                    )
                )
        })

    return events