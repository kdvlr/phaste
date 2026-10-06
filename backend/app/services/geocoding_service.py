import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from PIL import Image, ExifTags
import reverse_geocoder as rg


def _convert_to_degrees(value) -> float:
    """Helper function to convert GPS coordinates stored in EXIF to decimal degrees."""
    try:
        d = float(value[0])
        m = float(value[1])
        s = float(value[2])
        return d + (m / 60.0) + (s / 3600.0)
    except Exception:
        return 0.0


def extract_exif_metadata(image_path: Path) -> Dict[str, Any]:
    """Extract camera, timestamp, and GPS data from image EXIF."""
    metadata: Dict[str, Any] = {}
    if not image_path.exists():
        return metadata

    try:
        with Image.open(image_path) as img:
            exif_raw = img._getexif()
            if not exif_raw:
                return metadata

            exif_data = {}
            for tag_id, value in exif_raw.items():
                tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                exif_data[tag_name] = value

            # Camera details
            if "Make" in exif_data:
                metadata["camera_make"] = str(exif_data["Make"]).strip()
            if "Model" in exif_data:
                metadata["camera_model"] = str(exif_data["Model"]).strip()
            if "DateTimeOriginal" in exif_data:
                metadata["date_taken"] = str(exif_data["DateTimeOriginal"]).strip()
            if "ISO" in exif_data:
                metadata["iso"] = str(exif_data["ISO"])
            if "FNumber" in exif_data:
                metadata["f_number"] = float(exif_data["FNumber"])

            # GPS Processing
            gps_info = exif_data.get("GPSInfo")
            if gps_info:
                gps_tags = {}
                for key in gps_info.keys():
                    sub_tag = ExifTags.GPSTAGS.get(key, str(key))
                    gps_tags[sub_tag] = gps_info[key]

                lat_raw = gps_tags.get("GPSLatitude")
                lat_ref = gps_tags.get("GPSLatitudeRef")
                lon_raw = gps_tags.get("GPSLongitude")
                lon_ref = gps_tags.get("GPSLongitudeRef")

                if lat_raw and lon_raw and lat_ref and lon_ref:
                    lat = _convert_to_degrees(lat_raw)
                    if str(lat_ref).upper() != "N":
                        lat = -lat

                    lon = _convert_to_degrees(lon_raw)
                    if str(lon_ref).upper() != "E":
                        lon = -lon

                    metadata["latitude"] = round(lat, 6)
                    metadata["longitude"] = round(lon, 6)

    except Exception:
        pass

    return metadata


async def reverse_geocode_coordinates(lat: float, lon: float) -> Dict[str, Any]:
    """
    Offline reverse geocoding via reverse_geocoder (local KD-tree database).
    Returns City, State/Region, Country Code, and Country Name.
    """
    loop = asyncio.get_running_loop()

    def _lookup():
        try:
            results = rg.search((lat, lon))
            if results and len(results) > 0:
                match = results[0]
                city = match.get("name")
                admin1 = match.get("admin1")  # State/Province
                country = match.get("cc")     # ISO 2-letter country code
                return {
                    "city": city,
                    "region": admin1,
                    "country_code": country,
                    "formatted_location": f"{city}, {admin1}, {country}" if admin1 else f"{city}, {country}",
                    "latitude": lat,
                    "longitude": lon,
                }
        except Exception:
            pass
        return {
            "latitude": lat,
            "longitude": lon,
            "formatted_location": f"{lat:.4f}, {lon:.4f}",
        }

    return await loop.run_in_executor(None, _lookup)
