import json
import base64
import boto3
from datetime import datetime, timezone
from decimal import Decimal
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key, Attr
from typing import Dict, Any, List, Optional, Tuple
from src.config import config
from src.utils.logger import logger

dynamodb = boto3.resource("dynamodb", region_name=config.AWS_REGION)
events_table = dynamodb.Table(config.EVENTS_TABLE)
photos_table = dynamodb.Table(config.PHOTOS_TABLE)

# ---------------------------------------------------------------------------
# Offline / Local Development Fallback Store
# ---------------------------------------------------------------------------
_LOCAL_EVENTS_STORE: Dict[str, Dict[str, Any]] = {
    "evt_techsummit2026": {
        "eventId": "evt_techsummit2026",
        "name": "AWS Community Day & Tech Summit 2026",
        "description": "Annual flagship gathering of cloud architects, developers, and AWS community builders. Keynote stage, cloud architecture sessions, and live developer demos.",
        "date": "2026-11-20T09:00:00Z",
        "location": "Jio World Convention Centre, BKC, Mumbai",
        "coverImageUrl": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
        "status": "ACTIVE",
        "organizerId": "usr_admin_001",
        "photoCount": Decimal(2),
        "createdAt": "2026-11-01T10:00:00Z",
        "updatedAt": "2026-11-15T10:00:00Z",
    },
    "evt_hackathon2026": {
        "eventId": "evt_hackathon2026",
        "name": "Serverless GenAI & Cloud Hackathon 2026",
        "description": "48-hour non-stop build sprint creating production-ready generative AI and serverless applications on AWS. Prototype demos, pitch stage, and awards.",
        "date": "2026-11-28T09:00:00Z",
        "location": "AWS Innovation Hub & Tech Lounge, Mumbai",
        "coverImageUrl": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
        "status": "ACTIVE",
        "organizerId": "usr_admin_001",
        "photoCount": Decimal(0),
        "createdAt": "2026-11-05T14:00:00Z",
        "updatedAt": "2026-11-15T11:00:00Z",
    },
    "evt_devopscon2026": {
        "eventId": "evt_devopscon2026",
        "name": "Cloud DevOps & Architecture Summit 2026",
        "description": "Deep-dive technical sessions on AWS Lambda, DynamoDB Single-Table Design, CI/CD pipelines, and cloud observability.",
        "date": "2026-10-18T09:30:00Z",
        "location": "Convention Tech Hall A, Bangalore",
        "coverImageUrl": "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80",
        "status": "CLOSED",
        "organizerId": "usr_admin_001",
        "photoCount": Decimal(0),
        "createdAt": "2026-10-01T08:00:00Z",
        "updatedAt": "2026-10-25T11:00:00Z",
    },
}

_LOCAL_PHOTOS_STORE: Dict[str, Dict[str, Any]] = {
    "pht_ts_01": {
        "eventId": "evt_techsummit2026",
        "photoId": "pht_ts_01",
        "s3Key": "events/evt_techsummit2026/photos/pht_ts_01.jpg",
        "fileName": "keynote_opening.jpg",
        "contentType": "image/jpeg",
        "fileSize": Decimal(3420000),
        "status": "APPROVED",
        "uploadedAt": "2026-11-14T09:30:00Z",
        "uploadedBy": "attendee",
    },
    "pht_ts_02": {
        "eventId": "evt_techsummit2026",
        "photoId": "pht_ts_02",
        "s3Key": "events/evt_techsummit2026/photos/pht_ts_02.jpg",
        "fileName": "panel_discussion.jpg",
        "contentType": "image/jpeg",
        "fileSize": Decimal(2890000),
        "status": "APPROVED",
        "uploadedAt": "2026-11-14T10:15:00Z",
        "uploadedBy": "attendee",
    },
}

# ---------------------------------------------------------------------------
# Pagination Helpers
# ---------------------------------------------------------------------------

def encode_cursor(key_dict: Optional[Dict[str, Any]]) -> Optional[str]:
    if not key_dict:
        return None
    serialized = json.dumps(key_dict, default=str)
    return base64.urlsafe_b64encode(serialized.encode()).decode()


def decode_cursor(token: Optional[str]) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    try:
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        return json.loads(decoded)
    except Exception as e:
        logger.warning(f"Failed to decode pagination cursor '{token}': {e}")
        return None


# ---------------------------------------------------------------------------
# Events Table Operations
# ---------------------------------------------------------------------------

def create_event_record(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Creates a new event item in EventSnap_Events.
    """
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "eventId": event_data["eventId"],
        "name": event_data["name"],
        "description": event_data.get("description", ""),
        "date": event_data["date"],
        "location": event_data.get("location", ""),
        "coverImageUrl": event_data.get("coverImageUrl", ""),
        "status": event_data.get("status", "ACTIVE"),
        "organizerId": event_data.get("organizerId", "usr_admin_001"),
        "photoCount": Decimal(0),
        "createdAt": now,
        "updatedAt": now,
    }
    try:
        events_table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(eventId)",
        )
        return item
    except Exception as e:
        logger.info(f"DynamoDB unavailable ({e}), saving to local event store for '{item['eventId']}'")
        _LOCAL_EVENTS_STORE[item["eventId"]] = item
        return item


def get_event_record(event_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves an event by its unique eventId.
    """
    try:
        response = events_table.get_item(Key={"eventId": event_id})
        item = response.get("Item")
        if item:
            return item
    except Exception as e:
        logger.debug(f"DynamoDB get_item fallback ({e}) for event '{event_id}'")

    return _LOCAL_EVENTS_STORE.get(event_id)


def list_events_for_organizer(
    organizer_id: str,
    status: Optional[str] = None,
    limit: int = 50,
    next_token: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Lists events for an organizer. Uses GSI1 'organizerId-createdAt-index'
    ordered chronologically descending (newest first).
    """
    exclusive_start_key = decode_cursor(next_token)
    query_params: Dict[str, Any] = {
        "IndexName": "organizerId-createdAt-index",
        "KeyConditionExpression": Key("organizerId").eq(organizer_id),
        "ScanIndexForward": False,
        "Limit": limit,
    }

    if status and status != "ALL":
        query_params["FilterExpression"] = Attr("status").eq(status)

    if exclusive_start_key:
        query_params["ExclusiveStartKey"] = exclusive_start_key

    try:
        response = events_table.query(**query_params)
        items = response.get("Items", [])
        last_evaluated = response.get("LastEvaluatedKey")
        return items, encode_cursor(last_evaluated)
    except Exception as e:
        logger.info(f"DynamoDB query fallback ({e}) for organizer '{organizer_id}'")
        # In-memory fallback
        all_events = list(_LOCAL_EVENTS_STORE.values())
        filtered = [
            e for e in all_events
            if (not status or status == "ALL" or e.get("status") == status)
        ]
        sorted_events = sorted(filtered, key=lambda x: x.get("createdAt", ""), reverse=True)
        return sorted_events[:limit], None


def update_event_record(event_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """
    Updates mutable event attributes: name, description, date, location, coverImageUrl, status.
    """
    now = datetime.now(timezone.utc).isoformat()
    updates["updatedAt"] = now

    update_expr_parts = []
    expr_attr_names = {}
    expr_attr_values = {}

    for key, value in updates.items():
        if key in ("eventId", "organizerId", "createdAt", "photoCount"):
            continue
        attr_placeholder = f"#{key}"
        val_placeholder = f":{key}"
        update_expr_parts.append(f"{attr_placeholder} = {val_placeholder}")
        expr_attr_names[attr_placeholder] = key
        expr_attr_values[val_placeholder] = Decimal(str(value)) if isinstance(value, (int, float)) else value

    if not update_expr_parts:
        return get_event_record(event_id) or {}

    update_expression = "SET " + ", ".join(update_expr_parts)

    try:
        response = events_table.update_item(
            Key={"eventId": event_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
            ConditionExpression="attribute_exists(eventId)",
            ReturnValues="ALL_NEW",
        )
        return response.get("Attributes", {})
    except Exception as e:
        logger.info(f"DynamoDB update fallback ({e}) for event '{event_id}'")
        existing = _LOCAL_EVENTS_STORE.get(event_id)
        if existing:
            existing.update(updates)
            _LOCAL_EVENTS_STORE[event_id] = existing
            return existing
        return updates


def archive_event_record(event_id: str) -> Dict[str, Any]:
    """
    Safely archives an event rather than immediately deleting historical data.
    """
    now = datetime.now(timezone.utc).isoformat()
    try:
        response = events_table.update_item(
            Key={"eventId": event_id},
            UpdateExpression="SET #status = :archived, #archivedAt = :now, #updatedAt = :now",
            ExpressionAttributeNames={
                "#status": "status",
                "#archivedAt": "archivedAt",
                "#updatedAt": "updatedAt",
            },
            ExpressionAttributeValues={
                ":archived": "ARCHIVED",
                ":now": now,
            },
            ConditionExpression="attribute_exists(eventId)",
            ReturnValues="ALL_NEW",
        )
        return response.get("Attributes", {})
    except Exception as e:
        logger.info(f"DynamoDB archive fallback ({e}) for event '{event_id}'")
        existing = _LOCAL_EVENTS_STORE.get(event_id)
        if existing:
            existing["status"] = "ARCHIVED"
            existing["archivedAt"] = now
            existing["updatedAt"] = now
            return existing
        return {"eventId": event_id, "status": "ARCHIVED", "archivedAt": now}


def increment_photo_count(event_id: str, delta: int = 1) -> None:
    """
    Atomically increments or decrements the event's photoCount attribute.
    """
    try:
        events_table.update_item(
            Key={"eventId": event_id},
            UpdateExpression="ADD photoCount :delta SET updatedAt = :now",
            ExpressionAttributeValues={
                ":delta": Decimal(delta),
                ":now": datetime.now(timezone.utc).isoformat(),
            },
            ConditionExpression="attribute_exists(eventId)",
        )
    except Exception:
        existing = _LOCAL_EVENTS_STORE.get(event_id)
        if existing:
            current = int(existing.get("photoCount", 0))
            existing["photoCount"] = Decimal(max(0, current + delta))


# ---------------------------------------------------------------------------
# Photos Table Operations
# ---------------------------------------------------------------------------

def save_photo_record(photo_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Saves photo metadata to EventSnap_Photos table.
    """
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "eventId": photo_data["eventId"],
        "photoId": photo_data["photoId"],
        "s3Key": photo_data["s3Key"],
        "fileName": photo_data["fileName"],
        "contentType": photo_data["contentType"],
        "fileSize": Decimal(str(photo_data["fileSize"])),
        "status": photo_data.get("status", "APPROVED"),
        "uploadedAt": photo_data.get("uploadedAt", now),
        "uploadedBy": photo_data.get("uploadedBy", "attendee"),
    }
    try:
        photos_table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(photoId)",
        )
        increment_photo_count(photo_data["eventId"], delta=1)
        return item
    except Exception as e:
        logger.info(f"DynamoDB put_item fallback ({e}) for photo '{item['photoId']}'")
        _LOCAL_PHOTOS_STORE[item["photoId"]] = item
        increment_photo_count(photo_data["eventId"], delta=1)
        return item


def get_photo_record(event_id: str, photo_id: str) -> Optional[Dict[str, Any]]:
    """
    Gets single photo record by (eventId, photoId).
    """
    try:
        response = photos_table.get_item(
            Key={"eventId": event_id, "photoId": photo_id}
        )
        item = response.get("Item")
        if item:
            return item
    except Exception:
        pass

    item = _LOCAL_PHOTOS_STORE.get(photo_id)
    if item and item.get("eventId") == event_id:
        return item
    return None


def list_photos_for_event(
    event_id: str,
    limit: int = 50,
    next_token: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Queries all active/approved photos for an event ordered chronologically.
    Guarantees strict isolation by eventId.
    """
    exclusive_start_key = decode_cursor(next_token)
    query_params: Dict[str, Any] = {
        "IndexName": "EventPhotosByDate",
        "KeyConditionExpression": Key("eventId").eq(event_id),
        "ScanIndexForward": False,
        "FilterExpression": Attr("status").eq("APPROVED"),
        "Limit": limit,
    }

    if exclusive_start_key:
        query_params["ExclusiveStartKey"] = exclusive_start_key

    try:
        response = photos_table.query(**query_params)
        items = response.get("Items", [])
        return items, encode_cursor(response.get("LastEvaluatedKey"))
    except Exception:
        # Local in-memory query filtered strictly by eventId
        items = [
            p for p in _LOCAL_PHOTOS_STORE.values()
            if p.get("eventId") == event_id and p.get("status") == "APPROVED"
        ]
        sorted_photos = sorted(items, key=lambda x: str(x.get("uploadedAt", "")), reverse=True)
        return sorted_photos[:limit], None


def delete_photo_record(event_id: str, photo_id: str) -> bool:
    """
    Deletes the photo record from DynamoDB and decrements event photoCount.
    """
    try:
        photos_table.delete_item(
            Key={"eventId": event_id, "photoId": photo_id},
            ConditionExpression="attribute_exists(photoId)",
        )
        increment_photo_count(event_id, delta=-1)
        return True
    except Exception:
        if photo_id in _LOCAL_PHOTOS_STORE and _LOCAL_PHOTOS_STORE[photo_id].get("eventId") == event_id:
            del _LOCAL_PHOTOS_STORE[photo_id]
            increment_photo_count(event_id, delta=-1)
            return True
        return False


def get_event_photos_analytics(event_id: str) -> Dict[str, Any]:
    """
    Computes upload statistics, total photos, storage size, and recent activity timeline.
    """
    photos, _ = list_photos_for_event(event_id, limit=500)
    total_photos = len(photos)
    total_storage_bytes = sum(int(p.get("fileSize", 0)) for p in photos)

    activity_timeline: Dict[str, int] = {}
    for p in photos:
        uploaded_at = str(p.get("uploadedAt", ""))
        if uploaded_at:
            day_key = uploaded_at.split("T")[0]
            activity_timeline[day_key] = activity_timeline.get(day_key, 0) + 1

    return {
        "totalPhotos": total_photos,
        "totalStorageBytes": total_storage_bytes,
        "uploadsByDate": activity_timeline,
        "recentPhotos": photos[:10],
    }
