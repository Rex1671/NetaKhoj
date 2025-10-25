import csv
import json

# Read the CSV file
with open('andhra-pradesh_assembly_term_16.csv', 'r', encoding='utf-8') as csv_file:
    csv_reader = csv.DictReader(csv_file)
    data = list(csv_reader)

# Write to JSON file
with open('andhra-pradesh_assembly_term_16.json', 'w', encoding='utf-8') as json_file:
    json.dump(data, json_file, indent=4, ensure_ascii=False)

print("CSV converted to JSON successfully.")
