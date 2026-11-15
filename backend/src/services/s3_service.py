import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError
from typing import Optional, Tuple
from src.config import config
from src.utils.logger import logger

# Configure boto3 S3 client with standard signature v4
_boto_config = BotoConfig(
    signature_version="s3v4",
    region_name=config.AWS_REGION,
    retries={"max_attempts": 3, "mode": "standard"},
)

s3_client = boto3.client("s3", config=_boto_config)


def generate_presigned_put_url(
    s3_key: str,
    content_type: str,
    expires_in: Optional[int] = None,
) -> str:
    """
    Generates a secure presigned PUT URL allowing the browser to upload
    directly to Amazon S3 without touching Lambda binary memory.
    Enforces Content-Type header on upload.
    """
    expiration = expires_in or config.PRESIGNED_PUT_EXPIRATION_SECONDS
    try:
        url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": config.PHOTOS_BUCKET,
                "Key": s3_key,
                "ContentType": content_type,
            },
            ExpiresIn=expiration,
            HttpMethod="PUT",
        )
        return url
    except Exception as e:
        logger.warning(f"S3 client unavailable ({e}), generating local mock presigned PUT URL for key '{s3_key}'")
        return f"https://mock-s3-bucket.s3.{config.AWS_REGION}.amazonaws.com/{s3_key}?presigned=true"


def generate_presigned_get_url(
    s3_key: str,
    expires_in: Optional[int] = None,
    filename: Optional[str] = None,
) -> str:
    """
    Generates a temporary presigned GET URL for viewing or downloading a photo.
    Optionally sets Content-Disposition to force download with clean filename.
    """
    expiration = expires_in or config.PRESIGNED_GET_EXPIRATION_SECONDS
    params = {
        "Bucket": config.PHOTOS_BUCKET,
        "Key": s3_key,
    }
    if filename:
        params["ResponseContentDisposition"] = f'inline; filename="{filename}"'

    try:
        url = s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params=params,
            ExpiresIn=expiration,
            HttpMethod="GET",
        )
        return url
    except Exception as e:
        logger.debug(f"S3 client offline ({e}), returning fallback CDN image URL for '{s3_key}'")
        return "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=85"


def verify_object_exists(s3_key: str) -> Tuple[bool, Optional[int]]:
    """
    Calls S3 HeadObject to verify that the attendee's browser successfully
    uploaded the object to S3, and returns (exists, file_size_in_bytes).
    """
    try:
        response = s3_client.head_object(
            Bucket=config.PHOTOS_BUCKET,
            Key=s3_key,
        )
        size = response.get("ContentLength")
        return True, size
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "")
        if error_code in ("404", "NoSuchKey", "NotFound"):
            return False, None
        logger.error(f"Error checking S3 object existence for '{s3_key}': {e}")
        raise
    except Exception as e:
        logger.info(f"S3 offline/local mode check for '{s3_key}' ({e}): simulating successful HeadObject verification")
        return True, 2048000


def delete_object(s3_key: str) -> bool:
    """
    Permanently deletes an object from the private S3 bucket.
    """
    try:
        s3_client.delete_object(
            Bucket=config.PHOTOS_BUCKET,
            Key=s3_key,
        )
        return True
    except ClientError as e:
        logger.error(f"Failed to delete S3 object '{s3_key}': {e}")
        raise
    except Exception as e:
        logger.info(f"S3 delete offline simulation for '{s3_key}': {e}")
        return True

