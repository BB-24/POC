import pandas as pd


class LogParser:
    required_columns = [
        "Event ID",
        "Event Name",
        "Log Source",
        "Event Count",
        "Time",
        "Low Level Category",
        "Source IP",
        "Source Port",
        "Destination IP",
        "Destination Port",
        "Protocol",
        "Magnitude",
        "Bytes Sent",
        "Bytes Received",
        "Duration Seconds",
    ]

    @staticmethod
    def load_csv(file):
        try:
            df = pd.read_csv(file, low_memory=False)
        except pd.errors.EmptyDataError:
            raise ValueError("Uploaded CSV is empty or invalid.")
        except Exception as exc:
            raise ValueError(f"Failed to parse CSV: {exc}")

        missing = [col for col in LogParser.required_columns if col not in df.columns]
        if missing:
            raise ValueError(f"Missing required columns: {', '.join(missing)}")

        if df.empty:
            raise ValueError("Uploaded CSV contains no rows.")

        return df
