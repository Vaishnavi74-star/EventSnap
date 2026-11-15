import os
from typing import List

class Config:
    # AWS Region
    AWS_REGION: str = os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "ap-southeast-2"))

    # DynamoDB Tables
    EVENTS_TABLE: str = os.getenv("EVENTS_TABLE", "EventSnap_Events")
    PHOTOS_TABLE: str = os.getenv("PHOTOS_TABLE", "EventSnap_Photos")

    # S3 Storage Bucket
    PHOTOS_BUCKET: str = os.getenv("PHOTOS_BUCKET", "eventsnap-photo-storage")

    # Amazon Cognito Settings
    COGNITO_USER_POOL_ID: str = os.getenv("COGNITO_USER_POOL_ID", "")
    COGNITO_CLIENT_ID: str = os.getenv("COGNITO_CLIENT_ID", "")
    COGNITO_JWKS_URL: str = (
        f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
        if COGNITO_USER_POOL_ID
        else ""
    )

    # Photo Upload Constraints
    MAX_FILE_SIZE_BYTES: int = int(os.getenv("MAX_FILE_SIZE_BYTES", str(25 * 1024 * 1024))) # 25 MB
    ALLOWED_MIME_TYPES: List[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/jpg",
    ]

    # Presigned URL Lifecycles
    PRESIGNED_PUT_EXPIRATION_SECONDS: int = int(os.getenv("PRESIGNED_PUT_EXPIRATION_SECONDS", "900")) # 15 minutes
    PRESIGNED_GET_EXPIRATION_SECONDS: int = int(os.getenv("PRESIGNED_GET_EXPIRATION_SECONDS", "3600")) # 1 hour

    # CORS
    CORS_ALLOWED_ORIGINS: str = os.getenv("CORS_ALLOWED_ORIGINS", "*")
    CORS_ALLOWED_HEADERS: str = "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
    CORS_ALLOWED_METHODS: str = "GET,POST,PUT,PATCH,DELETE,OPTIONS"


config = Config()

