import sys
import os
import types

# Ensure 'src' package resolves cleanly when Lambda executes with CodeUri: ../src/
if "src" not in sys.modules:
    _src_pkg = types.ModuleType("src")
    _src_pkg.__path__ = [os.path.dirname(os.path.abspath(__file__))]
    sys.modules["src"] = _src_pkg

import re
from typing import Dict, Any, Callable, Optional
from src.handlers.events_handler import (
    handle_create_event,
    handle_list_events,
    handle_get_event,
    handle_update_event,
    handle_update_event_status,
    handle_delete_event,
    handle_get_event_analytics,
)
from src.handlers.photos_handler import (
    handle_get_upload_url,
    handle_confirm_photo_upload,
    handle_list_photos,
    handle_delete_photo,
)
from src.utils.response import cors_preflight, error
from src.utils.logger import logger, log_event


def extract_http_method_and_path(event: Dict[str, Any]) -> tuple[str, str]:
    """
    Extracts HTTP method and raw path from HTTP API v2 or REST API v1 event.
    """
    # HTTP API v2
    if "requestContext" in event and "http" in event["requestContext"]:
        http_ctx = event["requestContext"]["http"]
        return http_ctx.get("method", "GET").upper(), event.get("rawPath") or http_ctx.get("path", "/")

    # REST API v1 / ALB / Local runner
    method = event.get("httpMethod", "GET").upper()
    path = event.get("path", "/")
    return method, path


def match_route(method: str, path: str) -> tuple[Optional[Callable], Dict[str, str]]:
    """
    Regex pattern matcher to resolve route and extract pathParameters
    regardless of whether API Gateway or local runner passed them.
    """
    # Strip any trailing slash (except root)
    if path != "/" and path.endswith("/"):
        path = path[:-1]

    # Strip /api/v1 prefix if present
    if path.startswith("/api/v1"):
        path = path[len("/api/v1") :] or "/"

    routes = [
        # Event Management (supports both /events and /admin/events)
        ("POST", r"^/events$", handle_create_event, []),
        ("POST", r"^/admin/events$", handle_create_event, []),
        ("GET", r"^/events$", handle_list_events, []),
        ("GET", r"^/admin/events$", handle_list_events, []),
        ("GET", r"^/events/(?P<eventId>[^/]+)$", handle_get_event, ["eventId"]),
        ("GET", r"^/admin/events/(?P<eventId>[^/]+)$", handle_get_event, ["eventId"]),
        ("PUT", r"^/events/(?P<eventId>[^/]+)$", handle_update_event, ["eventId"]),
        ("PUT", r"^/admin/events/(?P<eventId>[^/]+)$", handle_update_event, ["eventId"]),
        ("PATCH", r"^/events/(?P<eventId>[^/]+)/status$", handle_update_event_status, ["eventId"]),
        ("PATCH", r"^/admin/events/(?P<eventId>[^/]+)/status$", handle_update_event_status, ["eventId"]),
        ("DELETE", r"^/events/(?P<eventId>[^/]+)$", handle_delete_event, ["eventId"]),
        ("DELETE", r"^/admin/events/(?P<eventId>[^/]+)$", handle_delete_event, ["eventId"]),
        ("GET", r"^/events/(?P<eventId>[^/]+)/analytics$", handle_get_event_analytics, ["eventId"]),
        ("GET", r"^/admin/events/(?P<eventId>[^/]+)/analytics$", handle_get_event_analytics, ["eventId"]),

        # Photo Upload & Gallery
        ("POST", r"^/events/(?P<eventId>[^/]+)/upload-url$", handle_get_upload_url, ["eventId"]),
        ("POST", r"^/events/(?P<eventId>[^/]+)/photos/upload-urls$", handle_get_upload_url, ["eventId"]),
        ("POST", r"^/events/(?P<eventId>[^/]+)/photos/confirm$", handle_confirm_photo_upload, ["eventId"]),
        ("GET", r"^/events/(?P<eventId>[^/]+)/photos$", handle_list_photos, ["eventId"]),
        ("DELETE", r"^/events/(?P<eventId>[^/]+)/photos/(?P<photoId>[^/]+)$", handle_delete_photo, ["eventId", "photoId"]),
        ("DELETE", r"^/admin/events/(?P<eventId>[^/]+)/photos/(?P<photoId>[^/]+)$", handle_delete_photo, ["eventId", "photoId"]),
    ]

    for r_method, pattern, handler, param_names in routes:
        if r_method == method:
            match = re.match(pattern, path)
            if match:
                path_params = match.groupdict()
                return handler, path_params

    return None, {}


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main AWS Lambda entry point for API Gateway HTTP API.
    """
    try:
        method, path = extract_http_method_and_path(event)

        # Handle CORS OPTIONS Preflight
        if method == "OPTIONS":
            return cors_preflight()

        # Route matching
        handler, extracted_params = match_route(method, path)

        if not handler:
            logger.warning(f"Route not found: {method} {path}")
            return error(f"Route not found: {method} {path}", 404, "NOT_FOUND")

        # Merge extracted path parameters into event['pathParameters']
        current_path_params = event.get("pathParameters") or {}
        event["pathParameters"] = {**current_path_params, **extracted_params}

        # Dispatch to handler
        return handler(event, context)

    except Exception as e:
        logger.error(f"Unhandled server error: {e}", exc_info=True)
        return error("Internal server error occurred.", 500, "INTERNAL_SERVER_ERROR")

