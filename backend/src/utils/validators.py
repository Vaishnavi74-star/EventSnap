import re
from datetime import datetime
from typing import Dict, Any, List, Tuple
from src.config import config

VALID_STATUSES = {"ACTIVE", "CLOSED", "ARCHIVED"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}

def validate_event_create(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    errors = []
    
    name = data.get("name")
    if not name or not isinstance(name, str) or not name.strip():
        errors.append("Event 'name' is required and must be a non-empty string.")
    elif len(name.strip()) > 120:
        errors.append("Event 'name' cannot exceed 120 characters.")

    date_str = data.get("date")
    if not date_str or not isinstance(date_str, str):
        errors.append("Event 'date' is required in ISO 8601 format (e.g., 2026-11-20T18:00:00Z).")
    else:
        try:
            # Accepts format with or without Z/offset
            clean_date = date_str.replace("Z", "+00:00")
            datetime.fromisoformat(clean_date)
        except ValueError:
            errors.append("Event 'date' must be a valid ISO 8601 date string.")

    status = data.get("status", "ACTIVE")
    if status not in VALID_STATUSES:
        errors.append(f"Event 'status' must be one of {list(VALID_STATUSES)}.")

    description = data.get("description")
    if description is not None and not isinstance(description, str):
        errors.append("Event 'description' must be a string.")

    location = data.get("location")
    if location is not None and not isinstance(location, str):
        errors.append("Event 'location' must be a string.")

    cover_image_url = data.get("coverImageUrl")
    if cover_image_url is not None and not isinstance(cover_image_url, str):
        errors.append("Event 'coverImageUrl' must be a string URL.")

    return len(errors) == 0, errors


def validate_event_update(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    errors = []
    
    if "name" in data:
        name = data["name"]
        if not isinstance(name, str) or not name.strip():
            errors.append("Event 'name' cannot be empty.")
        elif len(name.strip()) > 120:
            errors.append("Event 'name' cannot exceed 120 characters.")

    if "date" in data:
        date_str = data["date"]
        if not isinstance(date_str, str):
            errors.append("Event 'date' must be an ISO 8601 string.")
        else:
            try:
                datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            except ValueError:
                errors.append("Event 'date' must be a valid ISO 8601 date string.")

    if "status" in data:
        if data["status"] not in VALID_STATUSES:
            errors.append(f"Event 'status' must be one of {list(VALID_STATUSES)}.")

    return len(errors) == 0, errors


def validate_upload_request(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    errors = []
    
    file_name = data.get("fileName")
    if not file_name or not isinstance(file_name, str):
        errors.append("'fileName' is required.")
    else:
        ext = ("." + file_name.split(".")[-1]).lower() if "." in file_name else ""
        if ext not in ALLOWED_EXTENSIONS:
            errors.append(
                f"File extension '{ext}' is not permitted. Allowed extensions: {list(ALLOWED_EXTENSIONS)}."
            )

    content_type = data.get("contentType")
    if not content_type or not isinstance(content_type, str):
        errors.append("'contentType' is required (e.g. image/jpeg, image/png).")
    elif content_type.lower() not in [m.lower() for m in config.ALLOWED_MIME_TYPES]:
        errors.append(
            f"MIME type '{content_type}' is not allowed. Allowed types: {config.ALLOWED_MIME_TYPES}."
        )

    file_size = data.get("fileSize")
    if file_size is None or not isinstance(file_size, int) or file_size <= 0:
        errors.append("'fileSize' must be a positive integer in bytes.")
    elif file_size > config.MAX_FILE_SIZE_BYTES:
        mb = config.MAX_FILE_SIZE_BYTES / (1024 * 1024)
        errors.append(f"File size exceeds maximum allowed limit of {mb:.0f} MB.")

    return len(errors) == 0, errors

