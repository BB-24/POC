import pandas as pd


def build_category_magnitude(df):
    """
    Aggregates Magnitude by Low Level Category.
    Returns a list of categories with average magnitude.
    """
    if df.empty:
        return []

    grouped = df.groupby("Low Level Category").agg({
        "Magnitude": "mean"
    }).reset_index()

    grouped.columns = ["category", "magnitude"]
    grouped["magnitude"] = grouped["magnitude"].round(2)

    return grouped.sort_values("magnitude", ascending=False).to_dict(orient="records")
