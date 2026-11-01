"""Generate a deterministic, fictional CSV dataset for local development."""

import csv
import random
from pathlib import Path


SEED = 20261101
RECORDS = 7000
OUTPUT = Path(__file__).with_name("sample_records.csv")

USER_NAMES = [
    "amber_fox", "birch_sparrow", "cobalt_moth", "dune_otter", "ember_koala",
    "fable_lynx", "garden_wren", "harbor_panda", "indigo_tern", "juniper_mole",
    "kettle_badger", "lantern_owl", "maple_gecko", "nectar_heron", "orbit_vole",
    "pepper_finch", "quiet_yak", "river_lemur", "silver_puffin", "tulip_ferret",
    "umber_quail", "velvet_newt", "willow_macaw", "xenon_wombat", "yellow_crane",
    "zephyr_ibis", "acorn_dolphin", "bamboo_jay", "cloud_meerkat", "drift_toucan",
]
CITIES = [
    "Alderwick", "Bluehaven", "Cedar Hollow", "Dunewell", "Echo Falls",
    "Fernbridge", "Glimmer Bay", "Hollowmere", "Ivydale", "Juniper Crossing",
    "Kestrel Point", "Larkspur Vale", "Moss Harbor", "Northwind", "Orchard Glen",
    "Pebblebrook", "Quartzfield", "Rainford", "Starling Cove", "Thistleford",
    "Umberleigh", "Valleyglass", "Westmere", "Yarrow Creek", "Zephyr Heights",
]


def main():
    rng = random.Random(SEED)
    records = []
    for number in range(1, RECORDS + 1):
        username = f"{rng.choice(USER_NAMES)}{number:04d}"
        # Strings deliberately retain leading zeroes in mobile and postal values.
        mobile = f"0{rng.randrange(100_000_000, 1_000_000_000):09d}"
        postal_code = f"{rng.randrange(0, 100_000):05d}"
        records.append({
            "username": username,
            "email": f"{username}@example.com",
            "mobile": mobile,
            "city": rng.choice(CITIES),
            "postal_code": postal_code,
        })

    # Exactly 14 rows repeat the preceding record; retain all 7,000 rows.
    for index in range(1, 15):
        records[index] = records[index - 1].copy()

    # Missing optional values are deliberate and limited to city/postal_code.
    for index in rng.sample(range(15, RECORDS), 35):
        records[index]["city"] = ""
    for index in rng.sample(range(15, RECORDS), 50):
        records[index]["postal_code"] = ""

    with OUTPUT.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=["username", "email", "mobile", "city", "postal_code"])
        writer.writeheader()
        writer.writerows(records)

    print(f"Generated {RECORDS} data rows at {OUTPUT}")


if __name__ == "__main__":
    main()
