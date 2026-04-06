from __future__ import annotations

import csv
from io import StringIO


REQUIRED_COLUMNS = {"username", "full_name", "follower_count", "following_count", "category"}


def parse_snapshot_csv(raw_bytes: bytes) -> list[dict]:
    try:
        content = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        content = raw_bytes.decode("cp949")
    reader = csv.DictReader(StringIO(content))
    headers = set(reader.fieldnames or [])

    missing = REQUIRED_COLUMNS - headers
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")

    rows = []
    for row in reader:
        rows.append(
            {
                "username": row["username"].strip(),
                "full_name": row["full_name"].strip(),
                "follower_count": int(row["follower_count"] or 0),
                "following_count": int(row["following_count"] or 0),
                "category": row["category"].strip(),
            }
        )

    return rows
