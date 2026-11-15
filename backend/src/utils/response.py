import json
from decimal import Decimal
from datetime import datetime, date
from typing import Any, Dict, Optional
from src.config import config

class CustomJSONEncoder(json.JSONEncoder):
    """Handles DynamoDB Decimals, dates, and sets in JSON serialization."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            return float(obj)
        elif isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, set):
            return list(obj)
        return super().default(obj)


def get_cors_headers(origin: Optional[str] = None) -> Dict[str, str]:
    allowed_str = config.CORS_ALLOWED_ORIGINS
    origins_list = [o.strip() for o in allowed_str.split(",") if o.strip()]
    
    selected_origin = "*"
    if "*" in origins_list:
        selected_origin = "*"
    elif origin and origin in origins_list:
        selected_origin = origin
    elif origins_list:
        selected_origin = origins_list[0]

    return {
        "Access-Control-Allow-Origin": selected_origin,
        "Access-Control-Allow-Headers": config.CORS_ALLOWED_HEADERS,
        "Access-Control-Allow-Methods": config.CORS_ALLOWED_METHODS,
        "Content-Type": "application/json",
    }


def build_response(status_code: int, body: Any) -> Dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": get_cors_headers(),
        "body": json.dumps(body, cls=CustomJSONEncoder),
    }


def success(data: Any = None, status_code: int = 200, message: Optional[str] = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {}
    if message:
        payload["message"] = message
    if data is not None:
        payload["data"] = data
    elif not message:
        payload["data"] = {}
    return build_response(status_code, payload)


def error(
    message: str,
    status_code: int = 400,
    error_code: Optional[str] = None,
    details: Optional[Any] = None,
) -> Dict[str, Any]:
    payload = {
        "error": {
            "message": message,
            "code": error_code or f"HTTP_{status_code}",
        }
    }
    if details:
        payload["error"]["details"] = details
    return build_response(status_code, payload)


def cors_preflight() -> Dict[str, Any]:
    return {
        "statusCode": 204,
        "headers": get_cors_headers(),
        "body": "",
    }

