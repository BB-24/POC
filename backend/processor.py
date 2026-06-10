import pandas as pd


class LogProcessor:
    numeric_columns = [
        "Bytes Sent",
        "Bytes Received",
        "Duration Seconds",
    ]

    @staticmethod
    def process(df):
        df = df.copy()

        df["Time"] = pd.to_datetime(df["Time"], errors="coerce")
        if df["Time"].isna().any():
            raise ValueError("One or more timestamps in the CSV could not be parsed.")

        for column in LogProcessor.numeric_columns:
            df[column] = pd.to_numeric(df[column], errors="coerce").fillna(0).astype(float)

        return df
