import json
import uuid
from typing import Dict, Any
from src.services.auth_service import authenticate_admin, AuthenticationError
from src.services.dynamodb_service import (
    create_event_record,
    get_event_record,
    list_events_for_organizer,
    update_event_record,
    archive_event_record,
    get_event_photos_analytics,
)
from src.utils.validators import (
    validate_event_create,
    validate_event_update,
    VALID_STATUSES,
)
from src.utils.response import success, error
from src.utils.logger import logger, log_event

def handle_create_event(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    POST /events
    Creates a new event for the authenticated organizer.
    """
    try:
        admin = authenticate_admin(event)
    except AuthenticationError as e:
        return error(e.message, e.status_code, "UNAUTHORIZED")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return error("Invalid JSON request body.", 400, "BAD_REQUEST")

    valid, errors = validate_event_create(body)
    if not valid:
        return error("Event validation failed.", 400, "VALIDATION_ERROR", errors)

    event_id = "evt_" + uuid.uuid4().hex[:10]
    organizer_id = admin.get("sub") or admin.get("email") or "usr_admin_default"

    event_item = {
        "eventId": event_id,
        "name": body["name"].strip(),
        "description": (body.get("description") or "").strip(),
        "date": body["date"],
        "location": (body.get("location") or "").strip(),
        "coverImageUrl": (body.get("coverImageUrl") or "").strip(),
        "status": body.get("status", "ACTIVE"),
        "organizerId": organizer_id,
    }

    try:
        created = create_event_record(event_item)
        log_event("EventCreated", {"eventId": event_id, "organizerId": organizer_id})
        return success(created, status_code=201, message="Event created successfully.")
    except Exception as e:
        logger.error(f"Error in handle_create_event: {e}", exc_info=True)
        return error("Failed to create event.", 500, "INTERNAL_ERROR")


def handle_list_events(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    GET /events
    Lists events belonging to the authenticated organizer.
    """
    try:
        admin = authenticate_admin(event)
    except AuthenticationError as e:
        return error(e.message, e.status_code, "UNAUTHORIZED")

    params = event.get("queryStringParameters") or {}
    status_filter = params.get("status")
    limit = min(int(params.get("limit", 50)), 100)
    next_token = params.get("nextToken")

    organizer_id = admin.get("sub") or admin.get("email") or "usr_admin_default"

    try:
        items, next_cursor = list_events_for_organizer(
            organizer_id=organizer_id,
            status=status_filter,
            limit=limit,
            next_token=next_token,
        )
        return success(
            {"events": items, "nextToken": next_cursor},
            status_code=200,
        )
    except Exception as e:
        logger.error(f"Error in handle_list_events: {e}", exc_info=True)
        return error("Failed to list events.", 500, "INTERNAL_ERROR")


def handle_get_event(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    GET /events/{eventId}
    Retrieves public or admin event metadata.
    """
    path_params = event.get("pathParameters") or {}
    event_id = path_params.get("eventId")
    if not event_id:
        return error("Missing eventId in path parameters.", 400, "BAD_REQUEST")

    try:
        event_record = get_event_record(event_id)
        if not event_record:
            return error(f"Event with ID '{event_id}' was not found.", 404, "NOT_FOUND")

        # Security check: archived events are not public
        if event_record.get("status") == "ARCHIVED":
            try:
                authenticate_admin(event)
            except AuthenticationError:
                return error("This event is archived and unavailable.", 404, "NOT_FOUND")

        return success(event_record, status_code=200)
    except Exception as e:
        logger.error(f"Error in handle_get_event: {e}", exc_info=True)
        return error("Failed to retrieve event.", 500, "INTERNAL_ERROR")


def handle_update_event(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    PUT /events/{eventId}
    Updates event details (admin only).
    """
    try:
        authenticate_admin(event)
    except AuthenticationError as e:
        return error(e.message, e.status_code, "UNAUTHORIZED")

    path_params = event.get("pathParameters") or {}
    event_id = path_params.get("eventId")
    if not event_id:
        return error("Missing eventId in path parameters.", 400, "BAD_REQUEST")

    event_record = get_event_record(event_id)
    if not event_record:
        return error(f"Event with ID '{event_id}' was not found.", 404, "NOT_FOUND")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return error("Invalid JSON request body.", 400, "BAD_REQUEST")

    valid, errors = validate_event_update(body)
    if not valid:
        return error("Validation failed.", 400, "VALIDATION_ERROR", errors)

    try:
        updated = update_event_record(event_id, body)
        log_event("EventUpdated", {"eventId": event_id})
        return success(updated, status_code=200, message="Event updated successfully.")
    except Exception as e:
        logger.error(f"Error updating event '{event_id}': {e}", exc_info=True)
        return error("Failed to update event.", 500, "INTERNAL_ERROR")


def handle_update_event_status(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    PATCH /events/{eventId}/status
    Updates event status to ACTIVE, CLOSED, or ARCHIVED.
    """
    try:
        authenticate_admin(event)
    except AuthenticationError as e:
        return error(e.message, e.status_code, "UNAUTHORIZED")

    path_params = event.get("pathParameters") or {}
    event_id = path_params.get("eventId")
    if not event_id:
        return error("Missing eventId in path parameters.", 400, "BAD_REQUEST")

    event_record = get_event_record(event_id)
    if not event_record:
        return error(f"Event with ID '{event_id}' was not found.", 404, "NOT_FOUND")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return error("Invalid JSON request body.", 400, "BAD_REQUEST")

    new_status = body.get("status")
    if not new_status or new_status not in VALID_STATUSES:
        return error(
            f"Invalid status. Must be one of {list(VALID_STATUSES)}.",
            400,
            "INVALID_STATUS",
        )

    try:
        updated = update_event_record(event_id, {"status": new_status})
        log_event("EventStatusChanged", {"eventId": event_id, "status": new_status})
        return success(updated, status_code=200, message=f"Event status set to {new_status}.")
    except Exception as e:
        logger.error(f"Error setting status on event '{event_id}': {e}", exc_info=True)
        return error("Failed to update event status.", 500, "INTERNAL_ERROR")


def handle_delete_event(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    DELETE /events/{eventId}
    Implements safe archival rather than immediate hard-delete.
    """
    try:
        authenticate_admin(event)
    except AuthenticationError as e:
        return error(e.message, e.status_code, "UNAUTHORIZED")

    path_params = event.get("pathParameters") or {}
    event_id = path_params.get("eventId")
    if not event_id:
        return error("Missing eventId in path parameters.", 400, "BAD_REQUEST")

    event_record = get_event_record(event_id)
    if not event_record:
        return error(f"Event with ID '{event_id}' was not found.", 404, "NOT_FOUND")

    try:
        archived = archive_event_record(event_id)
        log_event("EventSafelyArchived", {"eventId": event_id})
        return success(
            archived,
            status_code=200,
            message="Event has been safely archived.",
        )
    except Exception as e:
        logger.error(f"Error archiving event '{event_id}': {e}", exc_info=True)
        return error("Failed to archive event.", 500, "INTERNAL_ERROR")


def handle_get_event_analytics(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    GET /events/{eventId}/analytics
    Retrieves photo counts, upload timelines, storage metrics, and event status.
    """
    try:
        authenticate_admin(event)
    except AuthenticationError as e:
        return error(e.message, e.status_code, "UNAUTHORIZED")

    path_params = event.get("pathParameters") or {}
    event_id = path_params.get("eventId")
    if not event_id:
        return error("Missing eventId in path parameters.", 400, "BAD_REQUEST")

    try:
        event_record = get_event_record(event_id)
        if not event_record:
            return error(f"Event with ID '{event_id}' not found.", 404, "NOT_FOUND")

        analytics = get_event_photos_analytics(event_id)
        analytics["event"] = {
            "eventId": event_record["eventId"],
            "name": event_record["name"],
            "status": event_record["status"],
            "date": event_record["date"],
        }
        return success(analytics, status_code=200)
    except Exception as e:
        logger.error(f"Error generating analytics for '{event_id}': {e}", exc_info=True)
        return error("Failed to retrieve event analytics.", 500, "INTERNAL_ERROR")

