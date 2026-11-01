"""Clean and expand the fictional sample CSV deterministically."""

import csv
import random
from pathlib import Path


SEED = 20261102
TARGET_ROWS = 10_000
BASE = Path(__file__).resolve().parent
SOURCE = BASE / "sample_records.csv"
OUTPUT = BASE / "sample_records_10000.csv"
FIELDS = ["username", "email", "mobile", "city", "postal_code"]
CITIES = [
    "Alderwick", "Bluehaven", "Cedar Hollow", "Dunewell", "Echo Falls",
    "Fernbridge", "Glimmer Bay", "Hollowmere", "Ivydale", "Juniper Crossing",
    "Kestrel Point", "Larkspur Vale", "Moss Harbor", "Northwind", "Orchard Glen",
    "Pebblebrook", "Quartzfield", "Rainford", "Starling Cove", "Thistleford",
    "Umberleigh", "Valleyglass", "Westmere", "Yarrow Creek", "Zephyr Heights",
]


def read_and_deduplicate():
    # DictReader does not infer numeric types; values such as 00123 stay strings.
    with SOURCE.open("r", newline="", encoding="utf-8-sig") as stream:
        reader = csv.DictReader(stream, restval="")
        if reader.fieldnames != FIELDS:
            raise ValueError(f"Expected CSV columns {FIELDS}; got {reader.fieldnames}")
        unique, seen = [], set()
        original_count = 0
        for row in reader:
            original_count += 1
            clean = {field: (row.get(field) or "") for field in FIELDS}
            signature = tuple(clean[field] for field in FIELDS)
            if signature not in seen:
                seen.add(signature)
                unique.append(clean)
    return original_count, unique


def main():
    original_count, rows = read_and_deduplicate()
    duplicates_removed = original_count - len(rows)
    if len(rows) > TARGET_ROWS:
        raise ValueError(f"{len(rows)} unique source rows exceed target {TARGET_ROWS}")

    rng = random.Random(SEED)
    usernames = {row["username"] for row in rows}
    full_rows = {tuple(row[field] for field in FIELDS) for row in rows}
    new_count = TARGET_ROWS - len(rows)
    generated = []
    next_id = 1
    while len(generated) < new_count:
        username = f"synthetic_user_{next_id:05d}"
        next_id += 1
        if username in usernames:
            continue
        # Use text formatting only; never cast mobile/postal fields to numbers.
        mobile = f"0{rng.randrange(100_000_000, 1_000_000_000):09d}"
        postal_code = f"{rng.randrange(100_000):05d}"
        row = {
            "username": username,
            "email": f"{username}@example.com",
            "mobile": mobile,
            "city": "" if rng.random() < 0.01 else rng.choice(CITIES),
            "postal_code": "" if rng.random() < 0.02 else postal_code,
        }
        signature = tuple(row[field] for field in FIELDS)
        if signature in full_rows:
            continue
        usernames.add(username)
        full_rows.add(signature)
        generated.append(row)

    # Interleave added records deterministically while retaining source row order.
    rows.extend(generated)
    with OUTPUT.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)

    print(f"Original rows: {original_count}")
    print(f"Exact duplicate occurrences removed: {duplicates_removed}")
    print(f"Unique source rows retained: {len(rows) - len(generated)}")
    print(f"New synthetic rows generated: {len(generated)}")
    print(f"Final rows: {len(rows)}")
    print(f"Output: {OUTPUT}")


if __name__ == "__main__":
    main()
