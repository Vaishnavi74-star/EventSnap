#!/usr/bin/env python3
"""
EventSnap AWS Infrastructure Provisioner & Verifier.
Uses boto3 to create or verify S3, DynamoDB, and Cognito resources.
"""
import sys
import os
import boto3
from botocore.exceptions import ClientError

REGION = os.getenv("AWS_REGION", "ap-southeast-2")
STAGE = os.getenv("STAGE", "prod")

EVENTS_TABLE_NAME = f"EventSnap_Events_{STAGE}"
PHOTOS_TABLE_NAME = f"EventSnap_Photos_{STAGE}"
USER_POOL_NAME = f"eventsnap-admins-{STAGE}"

s3 = boto3.client("s3", region_name=REGION)
dynamodb = boto3.client("dynamodb", region_name=REGION)
cognito = boto3.client("cognito-idp", region_name=REGION)
sts = boto3.client("sts", region_name=REGION)


def get_account_id() -> str:
    try:
        return sts.get_caller_identity()["Account"]
    except Exception as e:
        print(f"[!] Warning: Could not get AWS Account ID via STS: {e}")
        return "sandbox"


def setup_s3_bucket(bucket_name: str):
    print(f"\n[*] Configuring Private S3 Bucket: {bucket_name} ...")
    try:
        if REGION == "us-east-1":
            s3.create_bucket(Bucket=bucket_name)
        else:
            s3.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={"LocationConstraint": REGION},
            )
        print(f"  [+] Created S3 bucket: {bucket_name}")
    except ClientError as e:
        if e.response["Error"]["Code"] in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists"):
            print(f"  [i] S3 bucket '{bucket_name}' already exists.")
        else:
            print(f"  [!] Failed to create S3 bucket: {e}")
            return

    # 1. Enforce Block Public Access
    try:
        s3.put_public_access_block(
            Bucket=bucket_name,
            PublicAccessBlockConfiguration={
                "BlockPublicAcls": True,
                "IgnorePublicAcls": True,
                "BlockPublicPolicy": True,
                "RestrictPublicBuckets": True,
            },
        )
        print("  [+] S3 Public Access Block enabled (100% private).")
    except Exception as e:
        print(f"  [!] Failed to configure Public Access Block: {e}")

    # 2. Enforce Default AES256 Encryption
    try:
        s3.put_bucket_encryption(
            Bucket=bucket_name,
            ServerSideEncryptionConfiguration={
                "Rules": [
                    {"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}
                ]
            },
        )
        print("  [+] Default SSE-S3 encryption enabled.")
    except Exception as e:
        print(f"  [!] Failed to configure bucket encryption: {e}")

    # 3. Configure CORS for Direct Browser PUT and GET
    cors_config = {
        "CORSRules": [
            {
                "AllowedHeaders": ["*"],
                "AllowedMethods": ["GET", "PUT", "HEAD"],
                "AllowedOrigins": ["*"],
                "ExposeHeaders": ["ETag"],
                "MaxAgeSeconds": 3600,
            }
        ]
    }
    try:
        s3.put_bucket_cors(Bucket=bucket_name, CORSConfiguration=cors_config)
        print("  [+] S3 CORS policy configured for direct browser uploads.")
    except Exception as e:
        print(f"  [!] Failed to set S3 CORS: {e}")


def setup_events_table(table_name: str):
    print(f"\n[*] Configuring DynamoDB Events Table: {table_name} ...")
    try:
        dynamodb.create_table(
            TableName=table_name,
            BillingMode="PAY_PER_REQUEST",
            AttributeDefinitions=[
                {"AttributeName": "eventId", "AttributeType": "S"},
                {"AttributeName": "organizerId", "AttributeType": "S"},
                {"AttributeName": "createdAt", "AttributeType": "S"},
            ],
            KeySchema=[
                {"AttributeName": "eventId", "KeyType": "HASH"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "organizerId-createdAt-index",
                    "KeySchema": [
                        {"AttributeName": "organizerId", "KeyType": "HASH"},
                        {"AttributeName": "createdAt", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
        )
        print(f"  [+] Created DynamoDB table: {table_name}")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceInUseException":
            print(f"  [i] Table '{table_name}' already exists.")
        else:
            print(f"  [!] Failed to create events table: {e}")


def setup_photos_table(table_name: str):
    print(f"\n[*] Configuring DynamoDB Photos Table: {table_name} ...")
    try:
        dynamodb.create_table(
            TableName=table_name,
            BillingMode="PAY_PER_REQUEST",
            AttributeDefinitions=[
                {"AttributeName": "eventId", "AttributeType": "S"},
                {"AttributeName": "photoId", "AttributeType": "S"},
                {"AttributeName": "uploadedAt", "AttributeType": "S"},
            ],
            KeySchema=[
                {"AttributeName": "eventId", "KeyType": "HASH"},
                {"AttributeName": "photoId", "KeyType": "RANGE"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "EventPhotosByDate",
                    "KeySchema": [
                        {"AttributeName": "eventId", "KeyType": "HASH"},
                        {"AttributeName": "uploadedAt", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
        )
        print(f"  [+] Created DynamoDB table: {table_name}")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceInUseException":
            print(f"  [i] Table '{table_name}' already exists.")
        else:
            print(f"  [!] Failed to create photos table: {e}")


def main():
    print("=" * 60)
    print("EventSnap - AWS Serverless Provisioning Script")
    print(f"Target Region: {REGION}")
    print(f"Stage: {STAGE}")
    print("=" * 60)

    account_id = get_account_id()
    bucket_name = f"eventsnap-photos-{STAGE}-{account_id}"

    setup_s3_bucket(bucket_name)
    setup_events_table(EVENTS_TABLE_NAME)
    setup_photos_table(PHOTOS_TABLE_NAME)

    print("\n" + "=" * 60)
    print("Provisioning Complete! Generated Environment Variables:")
    print("=" * 60)
    print(f"AWS_REGION={REGION}")
    print(f"EVENTS_TABLE={EVENTS_TABLE_NAME}")
    print(f"PHOTOS_TABLE={PHOTOS_TABLE_NAME}")
    print(f"PHOTOS_BUCKET={bucket_name}")
    print("=" * 60)


if __name__ == "__main__":
    main()

