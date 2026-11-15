import json
import pytest
from unittest.mock import patch, MagicMock
from src.router import lambda_handler

@pytest.fixture
def admin_headers():
    return {
        "Authorization": "Bearer mock_jwt_token_eventsnap_admin_secure",
        "Content-Type": "application/json",
    }


def make_lambda_event(method: str, path: str, headers: dict = None, body: dict = None, query: dict = None):
    return {
        "version": "2.0",
        "routeKey": f"{method} {path}",
        "rawPath": path,
        "rawQueryString": "",
        "headers": headers or {},
        "queryStringParameters": query or {},
        "requestContext": {
            "http": {
                "method": method,
                "path": path,
                "protocol": "HTTP/1.1",
                "sourceIp": "127.0.0.1",
                "userAgent": "AuditTestSuite",
            },
            "stage": "$default",
        },
        "body": json.dumps(body) if body else None,
        "isBase64Encoded": False,
    }


# ============================================================================
# AUDIT TEST 1: Unauthorized Access Blocked on Admin APIs
# ============================================================================
def test_unauthorized_users_cannot_access_admin_apis():
    # 1. Create event without auth
    req = make_lambda_event("POST", "/events", body={"name": "Hacker Event", "date": "2026-11-20T00:00:00Z"})
    resp = lambda_handler(req, None)
    assert resp["statusCode"] == 401
    assert "Authorization" in json.loads(resp["body"])["error"]["message"]

    # 2. List admin events with invalid token
    req = make_lambda_event("GET", "/events", headers={"Authorization": "Bearer fake_invalid_token"})
    resp = lambda_handler(req, None)
    assert resp["statusCode"] == 401

    # 3. Update event without auth
    req = make_lambda_event("PUT", "/events/evt_test", body={"name": "Hacked"})
    resp = lambda_handler(req, None)
    assert resp["statusCode"] == 401

    # 4. Patch status without auth
    req = make_lambda_event("PATCH", "/events/evt_test/status", body={"status": "CLOSED"})
    resp = lambda_handler(req, None)
    assert resp["statusCode"] == 401

    # 5. Delete event without auth
    req = make_lambda_event("DELETE", "/events/evt_test")
    resp = lambda_handler(req, None)
    assert resp["statusCode"] == 401

    # 6. Delete photo without auth
    req = make_lambda_event("DELETE", "/events/evt_test/photos/pht_123")
    resp = lambda_handler(req, None)
    assert resp["statusCode"] == 401

    # 7. Get analytics without auth
    req = make_lambda_event("GET", "/events/evt_test/analytics")
    resp = lambda_handler(req, None)
    assert resp["statusCode"] == 401


# ============================================================================
# AUDIT TEST 2: Multiple Events Creation & Distinct Event IDs
# ============================================================================
@patch("src.services.dynamodb_service.events_table")
def test_create_multiple_events(mock_events_table, admin_headers):
    mock_events_table.put_item.return_value = {}

    # Create Event 1
    req1 = make_lambda_event(
        "POST",
        "/events",
        headers=admin_headers,
        body={"name": "Event One - Cloud Summit", "date": "2026-11-20T10:00:00Z", "location": "Hall A"},
    )
    resp1 = lambda_handler(req1, None)
    assert resp1["statusCode"] == 201
    data1 = json.loads(resp1["body"])["data"]
    id1 = data1["eventId"]

    # Create Event 2
    req2 = make_lambda_event(
        "POST",
        "/events",
        headers=admin_headers,
        body={"name": "Event Two - Art Exhibition", "date": "2026-11-25T18:00:00Z", "location": "Gallery 4"},
    )
    resp2 = lambda_handler(req2, None)
    assert resp2["statusCode"] == 201
    data2 = json.loads(resp2["body"])["data"]
    id2 = data2["eventId"]

    # Verify both IDs are unique and separate
    assert id1 != id2
    assert id1.startswith("evt_")
    assert id2.startswith("evt_")
    assert data1["name"] == "Event One - Cloud Summit"
    assert data2["name"] == "Event Two - Art Exhibition"


# ============================================================================
# AUDIT TEST 3: Rename Event & QR Code Immutability
# ============================================================================
@patch("src.services.dynamodb_service.events_table")
def test_rename_event_preserves_id_and_qr_url(mock_events_table, admin_headers):
    original_event = {
        "eventId": "evt_permanent123",
        "name": "Original Summit Name",
        "date": "2026-11-20T10:00:00Z",
        "location": "Moscone",
        "status": "ACTIVE",
        "organizerId": "usr_admin_001",
        "photoCount": 0,
    }
    mock_events_table.get_item.return_value = {"Item": original_event}
    mock_events_table.update_item.return_value = {
        "Attributes": {**original_event, "name": "Rebranded Worldwide Summit 2026"}
    }

    # Public QR URL before rename
    expected_qr_url = "/events/evt_permanent123"

    # Rename event via PUT /events/evt_permanent123
    rename_req = make_lambda_event(
        "PUT",
        "/events/evt_permanent123",
        headers=admin_headers,
        body={"name": "Rebranded Worldwide Summit 2026"},
    )
    resp = lambda_handler(rename_req, None)
    assert resp["statusCode"] == 200
    updated = json.loads(resp["body"])["data"]

    # Assert eventId remained immutable
    assert updated["eventId"] == "evt_permanent123"
    assert updated["name"] == "Rebranded Worldwide Summit 2026"

    # Verify public QR target endpoint remains 100% identical
    final_qr_target = f"/events/{updated['eventId']}"
    assert final_qr_target == expected_qr_url


# ============================================================================
# AUDIT TEST 4: Cross-Event Data Isolation (Photos Never Mix)
# ============================================================================
@patch("src.services.dynamodb_service.events_table")
@patch("src.services.dynamodb_service.photos_table")
@patch("src.services.s3_service.s3_client")
def test_photos_isolated_between_different_events(mock_s3, mock_photos_table, mock_events_table, admin_headers):
    event_a_id = "evt_event_aaa"
    event_b_id = "evt_event_bbb"

    mock_s3.generate_presigned_url.return_value = "https://s3.amazonaws.com/upload-presigned"
    mock_s3.head_object.return_value = {"ContentLength": 1024000}
    mock_photos_table.put_item.return_value = {}

    # Event A mock lookup
    def get_event_mock(Key):
        eid = Key.get("eventId")
        return {"Item": {"eventId": eid, "name": f"Event {eid}", "status": "ACTIVE"}}

    mock_events_table.get_item.side_effect = get_event_mock

    # 1. Attendee uploads to Event A
    req_a = make_lambda_event("POST", f"/events/{event_a_id}/upload-url", body={"fileName": "a.jpg", "contentType": "image/jpeg", "fileSize": 1024000})
    resp_a = lambda_handler(req_a, None)
    photo_a_id = json.loads(resp_a["body"])["data"]["photoId"]
    s3_key_a = json.loads(resp_a["body"])["data"]["s3Key"]
    assert s3_key_a.startswith(f"events/{event_a_id}/photos/")

    # 2. Attendee uploads to Event B
    req_b = make_lambda_event("POST", f"/events/{event_b_id}/upload-url", body={"fileName": "b.jpg", "contentType": "image/jpeg", "fileSize": 1024000})
    resp_b = lambda_handler(req_b, None)
    photo_b_id = json.loads(resp_b["body"])["data"]["photoId"]
    s3_key_b = json.loads(resp_b["body"])["data"]["s3Key"]
    assert s3_key_b.startswith(f"events/{event_b_id}/photos/")

    # Verify keys are completely segregated by event directory
    assert photo_a_id != photo_b_id
    assert event_a_id in s3_key_a and event_b_id not in s3_key_a
    assert event_b_id in s3_key_b and event_a_id not in s3_key_b

    # 3. Query Event A Gallery - mock DB returning only Event A's photos
    def query_photos_mock(**kwargs):
        expr = kwargs.get("KeyConditionExpression")
        # In real DynamoDB, Key("eventId").eq(event_id) strictly isolates by partition key
        target_eid = kwargs.get("ExpressionAttributeValues", {}).get(":v1") or event_a_id
        return {
            "Items": [
                {
                    "eventId": event_a_id,
                    "photoId": photo_a_id,
                    "s3Key": s3_key_a,
                    "fileName": "a.jpg",
                    "status": "APPROVED",
                }
            ]
        }

    mock_photos_table.query.side_effect = query_photos_mock

    gallery_req = make_lambda_event("GET", f"/events/{event_a_id}/photos")
    resp = lambda_handler(gallery_req, None)
    photos = json.loads(resp["body"])["data"]["photos"]

    # Verify all returned photos belong STRICTLY to Event A
    for p in photos:
        assert p["eventId"] == event_a_id
        assert p["photoId"] != photo_b_id


# ============================================================================
# AUDIT TEST 5: Close Event Blocks Attendee Uploads
# ============================================================================
@patch("src.services.dynamodb_service.events_table")
def test_close_event_blocks_attendee_upload(mock_events_table, admin_headers):
    event_id = "evt_closing_test"

    # Event is CLOSED
    mock_events_table.get_item.return_value = {
        "Item": {
            "eventId": event_id,
            "name": "Finished Celebration",
            "status": "CLOSED",
        }
    }

    # Attendee attempts to request an upload URL
    req = make_lambda_event(
        "POST",
        f"/events/{event_id}/upload-url",
        body={"fileName": "late_photo.jpg", "contentType": "image/jpeg", "fileSize": 2048000},
    )
    resp = lambda_handler(req, None)

    # Asserts upload is forbidden with 403 status
    assert resp["statusCode"] == 403
    error_body = json.loads(resp["body"])["error"]
    assert error_body["code"] == "EVENT_NOT_ACTIVE"
    assert "locked" in error_body["message"].lower() or "not active" in error_body["message"].lower()

    # Attendee attempts to confirm an upload
    confirm_req = make_lambda_event(
        "POST",
        f"/events/{event_id}/photos/confirm",
        body={"photoId": "pht_late", "s3Key": f"events/{event_id}/photos/pht_late.jpg"},
    )
    confirm_resp = lambda_handler(confirm_req, None)
    assert confirm_resp["statusCode"] == 403

