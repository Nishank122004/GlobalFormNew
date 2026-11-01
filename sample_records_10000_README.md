# Synthetic 10,000-record dataset

`sample_records_10000.csv` is fictional test data for local development and performance experiments. It is not production data and does not establish the eventual production CSV or database schema. Email addresses use `example.com`; generated city names are invented.

## Fields

The CSV has `username`, `email`, `mobile`, `city`, and `postal_code` columns. All values are read and written as strings. Mobile numbers and postal codes are never converted to integers, so leading zeroes remain intact. Blank `city` and `postal_code` fields represent optional missing values for import and NULL-handling tests.

## Cleaning and reproducibility

The generator reads `sample_records.csv`, removes only exact duplicate rows across all five columns, and retains the first occurrence and original field text. It then adds enough distinct synthetic records to reach exactly 10,000 rows. Generated usernames are unique against retained source usernames and each other; generated complete rows are checked for uniqueness. A fixed random seed (`20261102`) makes generation reproducible.

Run `python generate_dataset.py` from this directory to recreate `sample_records_10000.csv`. The process uses Python's CSV module and does not connect to a database or network service.
