import json
import pytest
from src.utils.validators import (
    validate_event_create,
    validate_event_update,
    validate_upload_request,
)
from src.utils.response import success, error, cors_preflight
from src.services.auth_service import verify_bearer_token, AuthenticationError
from src.router import match_route


def test_validate_event_create_valid():
    payload = {
        "name": "AWS Cloud Summit 2026",
        "description": "Annual cloud computing conference",
        "date": "2026-11-20T09:00:00Z",
        "location": "Moscone Center, SF",
        "status": "ACTIVE",
    }
    valid, errors = validate_event_create(payload)
    assert valid is True
    assert len(errors) == 0


def test_validate_event_create_invalid():
    # Missing name and invalid date
    payload = {
        "name": "",
        "date": "invalid-date",
        "status": "UNKNOWN_STATUS",
    }
    valid, errors = validate_event_create(payload)
    assert valid is False
    assert any("name" in e for e in errors)
    assert any("date" in e for e in errors)
    assert any("status" in e for e in errors)


def test_validate_upload_request_valid():
    payload = {
        "fileName": "photo_01.jpg",
        "contentType": "image/jpeg",
        "fileSize": 2048000,
    }
    valid, errors = validate_upload_request(payload)
    assert valid is True
    assert len(errors) == 0


def test_validate_upload_request_invalid_mime():
    # Disallowed MIME type (e.g. PDF or executable)
    payload = {
        "fileName": "document.pdf",
        "contentType": "application/pdf",
        "fileSize": 1024,
    }
    valid, errors = validate_upload_request(payload)
    assert valid is False
    assert any("extension" in e.lower() for e in errors)
    assert any("mime" in e.lower() for e in errors)


def test_validate_upload_request_file_too_large():
    # 50 MB exceeds 25 MB limit
    payload = {
        "fileName": "huge_raw_photo.jpg",
        "contentType": "image/jpeg",
        "fileSize": 50 * 1024 * 1024,
    }
    valid, errors = validate_upload_request(payload)
    assert valid is False
    assert any("exceeds" in e.lower() for e in errors)


def test_response_builder():
    resp = success({"key": "value"}, status_code=200)
    assert resp["statusCode"] == 200
    assert "Access-Control-Allow-Origin" in resp["headers"]
    body = json.loads(resp["body"])
    assert body["data"]["key"] == "value"


def test_cors_preflight():
    resp = cors_preflight()
    assert resp["statusCode"] == 204
    assert resp["headers"]["Access-Control-Allow-Methods"] != ""


def test_auth_verification():
    # Test valid dev token
    claims = verify_bearer_token("mock_jwt_token_eventsnap_admin_secure")
    assert claims["sub"] == "usr_admin_001"
    assert "Admins" in claims["cognito:groups"]

    # Test malformed / missing token
    with pytest.raises(AuthenticationError):
        verify_bearer_token("bad_token_value_without_kid")


def test_router_path_matching():
    # 1. Create event
    handler, params = match_route("POST", "/events")
    assert handler is not None
    assert params == {}

    # 2. Get event with eventId
    handler, params = match_route("GET", "/events/evt_techsummit")
    assert handler is not None
    assert params == {"eventId": "evt_techsummit"}

    # 3. Patch status
    handler, params = match_route("PATCH", "/events/evt_techsummit/status")
    assert handler is not None
    assert params == {"eventId": "evt_techsummit"}

    # 4. Request upload URL
    handler, params = match_route("POST", "/events/evt_techsummit/upload-url")
    assert handler is not None
    assert params == {"eventId": "evt_techsummit"}

    # 5. List photos
    handler, params = match_route("GET", "/events/evt_techsummit/photos")
    assert handler is not None
    assert params == {"eventId": "evt_techsummit"}

    # 6. Delete photo
    handler, params = match_route("DELETE", "/events/evt_techsummit/photos/pht_999")
    assert handler is not None
    assert params == {"eventId": "evt_techsummit", "photoId": "pht_999"}

