import geopandas as gpd
import os
import glob

# ---------------- CONFIG ----------------
# Folder containing shapefile components (.shp, .shx, .dbf, optional .prj)
shapefile_folder = r"C:\Users\bbrak\Desktop\fixKaroWeb - Copy\maps\assembly-constituencies"
 # <-- Set your folder path here
output_geojson = "india_assembly.geojson"

# Optional: Add constituency names manually if .dbf lacks meaningful attributes
# Leave empty if shapefile already has names
constituency_names = []  # Example: ["Constituency 1", "Constituency 2", ...]
# ----------------------------------------

# Find the first .shp file in the folder
shp_files = glob.glob(os.path.join(shapefile_folder, "*.shp"))
if not shp_files:
    raise FileNotFoundError("No .shp file found in the folder!")
shapefile_path = shp_files[0]
print(f"Using shapefile: {shapefile_path}")

# Check required components exist (.shp, .shx, .dbf)
for ext in ['.shp', '.shx', '.dbf']:
    path = shapefile_path.replace('.shp', ext)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Required file not found: {path}")

# Load shapefile
gdf = gpd.read_file(shapefile_path)
print(f"Loaded {len(gdf)} features")
print("Original columns:", gdf.columns)

# Add constituency names if provided
if constituency_names:
    if len(constituency_names) != len(gdf):
        raise ValueError("Length of constituency_names list does not match number of features!")
    gdf['name'] = constituency_names
elif 'name' not in gdf.columns:
    gdf['name'] = gdf.index.astype(str)  # fallback

# Convert CRS to WGS84 (EPSG:4326)
if gdf.crs is None:
    print("CRS not found in shapefile. Assuming EPSG:4326.")
else:
    gdf = gdf.to_crs(epsg=4326)

# Export to GeoJSON
gdf.to_file(output_geojson, driver="GeoJSON")
print(f"GeoJSON saved to {output_geojson}")
