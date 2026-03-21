"""DynamoDB table definitions for OSR Protocol.

Run: python infra/dynamodb_tables.py [--create]
Dry run by default. Pass --create to actually create tables.
"""

from __future__ import annotations

import sys

import boto3

REGION = "us-east-1"

TABLES = [
    {
        "TableName": "osr_wallet_scores",
        "KeySchema": [{"AttributeName": "wallet_address", "KeyType": "HASH"}],
        "AttributeDefinitions": [
            {"AttributeName": "wallet_address", "AttributeType": "S"},
            {"AttributeName": "tier", "AttributeType": "N"},
            {"AttributeName": "score", "AttributeType": "N"},
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "tier-score-index",
                "KeySchema": [
                    {"AttributeName": "tier", "KeyType": "HASH"},
                    {"AttributeName": "score", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            }
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "osr_telegram_users",
        "KeySchema": [{"AttributeName": "user_id", "KeyType": "HASH"}],
        "AttributeDefinitions": [
            {"AttributeName": "user_id", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "osr_x_engagements",
        "KeySchema": [{"AttributeName": "tweet_id", "KeyType": "HASH"}],
        "AttributeDefinitions": [
            {"AttributeName": "tweet_id", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "osr_drafts",
        "KeySchema": [
            {"AttributeName": "platform", "KeyType": "HASH"},
            {"AttributeName": "created_at", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "platform", "AttributeType": "S"},
            {"AttributeName": "created_at", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
]


def create_tables(dry_run: bool = True) -> None:
    client = boto3.client("dynamodb", region_name=REGION)
    existing = client.list_tables()["TableNames"]

    for table_def in TABLES:
        name = table_def["TableName"]
        if name in existing:
            print(f"  EXISTS: {name}")
            continue
        if dry_run:
            print(f"  WOULD CREATE: {name}")
        else:
            client.create_table(**table_def)
            print(f"  CREATED: {name}")


if __name__ == "__main__":
    dry_run = "--create" not in sys.argv
    if dry_run:
        print("DRY RUN (pass --create to actually create tables):\n")
    else:
        print("CREATING TABLES:\n")
    create_tables(dry_run=dry_run)
