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
                "userAgent": "IntegrationTestClient",
            },
            "stage": "$default",
        },
        "body": json.dumps(body) if body else None,
        "isBase64Encoded": False,
    }


@patch("src.services.dynamodb_service.events_table")
@patch("src.services.dynamodb_service.photos_table")
@patch("src.services.s3_service.s3_client")
def test_full_event_and_photo_lifecycle(mock_s3, mock_photos_table, mock_events_table, admin_headers):
    # Setup mocks
    mock_events_table.put_item.return_value = {}
    mock_photos_table.put_item.return_value = {}
    mock_s3.generate_presigned_url.return_value = "https://eventsnap-photos-prod.s3.amazonaws.com/test-key?signature=xyz"
    mock_s3.head_object.return_value = {"ContentLength": 2048000}
    mock_photos_table.delete_item.return_value = {}
    mock_s3.delete_object.return_value = {}

    # 1. Admin creates event: POST /events
    create_event_payload = {
        "name": "Cloud Expo 2026",
        "description": "Annual serverless summit",
        "date": "2026-11-20T10:00:00Z",
        "location": "San Francisco, CA",
        "status": "ACTIVE",
    }
    event_req = make_lambda_event("POST", "/events", headers=admin_headers, body=create_event_payload)
    resp = lambda_handler(event_req, None)
    assert resp["statusCode"] == 201
    created_event = json.loads(resp["body"])["data"]
    event_id = created_event["eventId"]
    assert event_id.startswith("evt_")
    assert created_event["name"] == "Cloud Expo 2026"

    # Mock get_item to return this event
    mock_events_table.get_item.return_value = {"Item": created_event}

    # 2. Public retrieves event: GET /events/{eventId}
    get_req = make_lambda_event("GET", f"/events/{event_id}")
    resp = lambda_handler(get_req, None)
    assert resp["statusCode"] == 200
    retrieved = json.loads(resp["body"])["data"]
    assert retrieved["eventId"] == event_id

    # 3. Attendee requests Presigned S3 PUT URL: POST /events/{eventId}/upload-url
    upload_url_req = make_lambda_event(
        "POST",
        f"/events/{event_id}/upload-url",
        body={"fileName": "keynote.jpg", "contentType": "image/jpeg", "fileSize": 2048000},
    )
    resp = lambda_handler(upload_url_req, None)
    assert resp["statusCode"] == 200
    upload_data = json.loads(resp["body"])["data"]
    photo_id = upload_data["photoId"]
    s3_key = upload_data["s3Key"]
    assert s3_key == f"events/{event_id}/photos/{photo_id}.jpg"
    assert "uploadUrl" in upload_data

    # 4. Attendee confirms upload after direct S3 PUT: POST /events/{eventId}/photos/confirm
    confirm_req = make_lambda_event(
        "POST",
        f"/events/{event_id}/photos/confirm",
        body={
            "photoId": photo_id,
            "s3Key": s3_key,
            "fileName": "keynote.jpg",
            "contentType": "image/jpeg",
            "fileSize": 2048000,
        },
    )
    resp = lambda_handler(confirm_req, None)
    assert resp["statusCode"] == 201
    confirm_data = json.loads(resp["body"])["data"]
    assert len(confirm_data["confirmed"]) == 1
    assert confirm_data["confirmed"][0]["photoId"] == photo_id
    assert "downloadUrl" in confirm_data["confirmed"][0]

    # 5. Attendee browses gallery: GET /events/{eventId}/photos
    mock_photos_table.query.return_value = {
        "Items": [
            {
                "eventId": event_id,
                "photoId": photo_id,
                "s3Key": s3_key,
                "fileName": "keynote.jpg",
                "contentType": "image/jpeg",
                "fileSize": 2048000,
                "status": "APPROVED",
                "uploadedAt": "2026-11-20T10:15:00Z",
            }
        ]
    }
    gallery_req = make_lambda_event("GET", f"/events/{event_id}/photos")
    resp = lambda_handler(gallery_req, None)
    assert resp["statusCode"] == 200
    gallery_data = json.loads(resp["body"])["data"]
    assert len(gallery_data["photos"]) == 1
    assert gallery_data["photos"][0]["downloadUrl"] != ""

    # 6. Admin deletes photo: DELETE /events/{eventId}/photos/{photoId}
    mock_photos_table.get_item.return_value = {
        "Item": {
            "eventId": event_id,
            "photoId": photo_id,
            "s3Key": s3_key,
        }
    }
    delete_photo_req = make_lambda_event(
        "DELETE", f"/events/{event_id}/photos/{photo_id}", headers=admin_headers
    )
    resp = lambda_handler(delete_photo_req, None)
    assert resp["statusCode"] == 200

    # 7. Admin updates event status to CLOSED: PATCH /events/{eventId}/status
    mock_events_table.update_item.return_value = {
        "Attributes": {**created_event, "status": "CLOSED"}
    }
    patch_req = make_lambda_event(
        "PATCH", f"/events/{event_id}/status", headers=admin_headers, body={"status": "CLOSED"}
    )
    resp = lambda_handler(patch_req, None)
    assert resp["statusCode"] == 200

    # 8. Verify upload is blocked when event is CLOSED
    mock_events_table.get_item.return_value = {"Item": {**created_event, "status": "CLOSED"}}
    blocked_upload_req = make_lambda_event(
        "POST",
        f"/events/{event_id}/upload-url",
        body={"fileName": "late.jpg", "contentType": "image/jpeg", "fileSize": 1024},
    )
    resp = lambda_handler(blocked_upload_req, None)
    assert resp["statusCode"] == 403
    assert "locked" in json.loads(resp["body"])["error"]["message"].lower()

