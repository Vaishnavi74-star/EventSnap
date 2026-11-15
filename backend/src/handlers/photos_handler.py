import json
import uuid
from typing import Dict, Any, List
from src.services.auth_service import authenticate_admin, AuthenticationError
from src.services.dynamodb_service import (
    get_event_record,
    save_photo_record,
    get_photo_record,
    list_photos_for_event,
    delete_photo_record,
)
from src.services.s3_service import (
    generate_presigned_put_url,
    generate_presigned_get_url,
    verify_object_exists,
    delete_object,
)
from src.utils.validators import validate_upload_request
from src.utils.response import success, error
from src.utils.logger import logger, log_event
from src.config import config


def handle_get_upload_url(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    POST /events/{eventId}/upload-url
    Validates event is ACTIVE, enforces MIME type & size, generates unique S3 key,
    and returns a presigned S3 PUT URL for direct browser upload.
    """
    path_params = event.get("pathParameters") or {}
    event_id = path_params.get("eventId")
    if not event_id:
        return error("Missing eventId in path parameters.", 400, "BAD_REQUEST")

    # 1. Verify event exists and is ACTIVE
    event_record = get_event_record(event_id)
    if not event_record:
        return error(f"Event with ID '{event_id}' not found.", 404, "NOT_FOUND")

    if event_record.get("status") != "ACTIVE":
        return error(
            f"Uploads are locked. Event status is '{event_record.get('status')}'.",
            403,
            "EVENT_NOT_ACTIVE",
        )

    # 2. Parse and validate request body
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return error("Invalid JSON request body.", 400, "BAD_REQUEST")

    # Support either batch upload ({"files": [...]}) or single file upload
    files_list = body.get("files")
    if files_list and isinstance(files_list, list):
        results = []
        for f in files_list:
            valid, errors = validate_upload_request(f)
            if not valid:
                return error(f"Upload validation failed for '{f.get('fileName', 'unknown')}': {', '.join(errors)}", 400, "VALIDATION_ERROR")
            
            photo_id = "pht_" + uuid.uuid4().hex[:12]
            ext = ("." + f["fileName"].split(".")[-1]).lower() if "." in f["fileName"] else ".jpg"
            s3_key = f"events/{event_id}/photos/{photo_id}{ext}"
            content_type = f["contentType"].lower()

            try:
                upload_url = generate_presigned_put_url(
                    s3_key=s3_key,
                    content_type=content_type,
                    expires_in=config.PRESIGNED_PUT_EXPIRATION_SECONDS,
                )
                results.append({
                    "photoId": photo_id,
                    "s3Key": s3_key,
                    "uploadUrl": upload_url,
                    "expiresIn": config.PRESIGNED_PUT_EXPIRATION_SECONDS,
                    "fileName": f["fileName"],
                })
            except Exception as e:
                logger.error(f"Failed to generate upload URL for '{s3_key}': {e}")
                return error("Could not generate upload URLs.", 500, "INTERNAL_ERROR")

        return success(
            {"uploadUrls": results, "count": len(results)},
            status_code=200,
        )

    # Single file upload path
    valid, errors = validate_upload_request(body)
    if not valid:
        return error("Upload validation failed.", 400, "VALIDATION_ERROR", errors)

    file_name = body["fileName"]
    content_type = body["contentType"].lower()
    file_size = body["fileSize"]

    # 3. Generate unique photoId and S3 object key
    photo_id = "pht_" + uuid.uuid4().hex[:12]
    ext = ("." + file_name.split(".")[-1]).lower() if "." in file_name else ".jpg"
    s3_key = f"events/{event_id}/photos/{photo_id}{ext}"

    # 4. Generate presigned S3 PUT URL
    try:
        upload_url = generate_presigned_put_url(
            s3_key=s3_key,
            content_type=content_type,
            expires_in=config.PRESIGNED_PUT_EXPIRATION_SECONDS,
        )

        log_event(
            "PresignedUploadUrlGenerated",
            {"eventId": event_id, "photoId": photo_id, "s3Key": s3_key, "fileSize": file_size},
        )

        return success(
            {
                "photoId": photo_id,
                "s3Key": s3_key,
                "uploadUrl": upload_url,
                "expiresIn": config.PRESIGNED_PUT_EXPIRATION_SECONDS,
                "maxSizeBytes": config.MAX_FILE_SIZE_BYTES,
            },
            status_code=200,
        )
    except Exception as e:
        logger.error(f"Failed to generate upload URL for event '{event_id}': {e}", exc_info=True)
        return error("Could not generate upload URL.", 500, "INTERNAL_ERROR")


def handle_confirm_photo_upload(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    POST /events/{eventId}/photos/confirm
    Verifies the uploaded object exists in S3 (via HeadObject), retrieves actual size,
    and registers photo metadata in DynamoDB.
    Supports either single photo confirm or batch confirm.
    """
    path_params = event.get("pathParameters") or {}
    event_id = path_params.get("eventId")
    if not event_id:
        return error("Missing eventId in path parameters.", 400, "BAD_REQUEST")

    # Verify event exists and is ACTIVE
    event_record = get_event_record(event_id)
    if not event_record:
        return error(f"Event with ID '{event_id}' not found.", 404, "NOT_FOUND")

    if event_record.get("status") != "ACTIVE":
        return error("Cannot confirm upload for an inactive event.", 403, "EVENT_NOT_ACTIVE")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return error("Invalid JSON request body.", 400, "BAD_REQUEST")

    # Support either {"photos": [...]} or single {"photoId", "s3Key", ...}
    photos_list = body.get("photos")
    if not photos_list:
        if "photoId" in body and "s3Key" in body:
            photos_list = [body]
        else:
            return error(
                "Request body must include 'photoId' and 's3Key' or a list of 'photos'.",
                400,
                "BAD_REQUEST",
            )

    confirmed_photos = []
    for p in photos_list:
        photo_id = p.get("photoId")
        s3_key = p.get("s3Key")
        file_name = p.get("fileName", f"{photo_id}.jpg")
        content_type = p.get("contentType", "image/jpeg")

        if not photo_id or not s3_key:
            continue

        # Security check: Ensure s3Key belongs to this eventId and contains no path traversal
        expected_prefix = f"events/{event_id}/photos/"
        if not s3_key.startswith(expected_prefix) or ".." in s3_key or "\\" in s3_key:
            logger.warning(f"S3 key path traversal rejected: {s3_key}")
            continue

        # Verify object physically exists in Amazon S3
        exists, actual_size = verify_object_exists(s3_key)
        if not exists:
            logger.warning(f"Confirm failed: object '{s3_key}' not found in S3 bucket.")
            continue

        photo_record = {
            "eventId": event_id,
            "photoId": photo_id,
            "s3Key": s3_key,
            "fileName": file_name,
            "contentType": content_type,
            "fileSize": actual_size if actual_size is not None else p.get("fileSize", 0),
            "status": "APPROVED",
            "uploadedBy": "attendee",
        }

        try:
            saved = save_photo_record(photo_record)
            # Add temporary download URL in response
            saved["downloadUrl"] = generate_presigned_get_url(s3_key, filename=file_name)
            confirmed_photos.append(saved)
        except Exception as e:
            logger.error(f"Error saving confirmed photo record '{photo_id}': {e}")

    if not confirmed_photos:
        return error(
            "None of the uploaded photos could be verified in S3 storage.",
            400,
            "VERIFICATION_FAILED",
        )

    log_event("PhotosConfirmed", {"eventId": event_id, "count": len(confirmed_photos)})
    return success(
        {"confirmed": confirmed_photos, "count": len(confirmed_photos)},
        status_code=201,
        message=f"Successfully confirmed {len(confirmed_photos)} photo(s).",
    )


def handle_list_photos(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    GET /events/{eventId}/photos
    Retrieves photo records from DynamoDB and generates temporary presigned GET URLs
    for secure client viewing. Supports pagination.
    """
    path_params = event.get("pathParameters") or {}
    event_id = path_params.get("eventId")
    if not event_id:
        return error("Missing eventId in path parameters.", 400, "BAD_REQUEST")

    # Verify event exists
    event_record = get_event_record(event_id)
    if not event_record:
        return error(f"Event with ID '{event_id}' not found.", 404, "NOT_FOUND")

    # Security check: If archived, restrict to authenticated admin
    if event_record.get("status") == "ARCHIVED":
        try:
            authenticate_admin(event)
        except AuthenticationError:
            return error("This event is archived and unavailable.", 404, "NOT_FOUND")

    params = event.get("queryStringParameters") or {}
    limit = min(int(params.get("limit", 50)), 100)
    next_token = params.get("nextToken")

    try:
        photos, next_cursor = list_photos_for_event(
            event_id=event_id,
            limit=limit,
            next_token=next_token,
        )

        # Generate temporary presigned GET URLs for each photo
        photos_with_urls = []
        for photo in photos:
            s3_key = photo.get("s3Key")
            if s3_key:
                photo_copy = dict(photo)
                photo_copy["downloadUrl"] = generate_presigned_get_url(
                    s3_key=s3_key,
                    expires_in=config.PRESIGNED_GET_EXPIRATION_SECONDS,
                    filename=photo.get("fileName"),
                )
                photo_copy["thumbnailUrl"] = photo_copy["downloadUrl"]
                photos_with_urls.append(photo_copy)

        return success(
            {
                "eventId": event_id,
                "photos": photos_with_urls,
                "count": len(photos_with_urls),
                "nextToken": next_cursor,
            },
            status_code=200,
        )
    except Exception as e:
        logger.error(f"Error listing photos for event '{event_id}': {e}", exc_info=True)
        return error("Failed to retrieve photos.", 500, "INTERNAL_ERROR")


def handle_delete_photo(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    DELETE /events/{eventId}/photos/{photoId}
    Admin-only operation: deletes S3 object and deletes DynamoDB metadata record.
    """
    try:
        authenticate_admin(event)
    except AuthenticationError as e:
        return error(e.message, e.status_code, "UNAUTHORIZED")

    path_params = event.get("pathParameters") or {}
    event_id = path_params.get("eventId")
    photo_id = path_params.get("photoId")

    if not event_id or not photo_id:
        return error("Missing eventId or photoId in path parameters.", 400, "BAD_REQUEST")

    try:
        # Verify event exists
        event_record = get_event_record(event_id)
        if not event_record:
            return error(f"Event with ID '{event_id}' not found.", 404, "NOT_FOUND")

        # 1. Fetch photo record to get exact S3 key
        photo = get_photo_record(event_id, photo_id)
        if not photo:
            return error(f"Photo '{photo_id}' not found for event '{event_id}'.", 404, "NOT_FOUND")

        s3_key = photo.get("s3Key")

        # 2. Delete S3 object (strictly scoped to this event)
        expected_prefix = f"events/{event_id}/photos/"
        if s3_key and s3_key.startswith(expected_prefix) and ".." not in s3_key:
            try:
                delete_object(s3_key)
            except Exception as s3_err:
                logger.warning(f"Could not delete S3 object '{s3_key}': {s3_err}")

        # 3. Delete DynamoDB record
        deleted = delete_photo_record(event_id, photo_id)
        if not deleted:
            return error("Photo record could not be removed.", 500, "INTERNAL_ERROR")

        log_event("PhotoDeleted", {"eventId": event_id, "photoId": photo_id, "s3Key": s3_key})
        return success(
            {"eventId": event_id, "photoId": photo_id},
            status_code=200,
            message="Photo successfully deleted from S3 and gallery.",
        )
    except Exception as e:
        logger.error(f"Error in handle_delete_photo: {e}", exc_info=True)
        return error("Failed to delete photo.", 500, "INTERNAL_ERROR")

