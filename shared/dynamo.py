"""DynamoDB helpers for OSR Protocol.

All tables use the osr_ prefix to avoid collision with System R tables.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

import boto3
import structlog
from boto3.dynamodb.conditions import Key

from shared.config import settings

logger = structlog.get_logger()

_dynamodb_resource = None


def _get_resource():
    global _dynamodb_resource
    if _dynamodb_resource is None:
        _dynamodb_resource = boto3.resource("dynamodb", region_name=settings.aws.region)
    return _dynamodb_resource


def _table_name(name: str) -> str:
    """Prefix table name with osr_ if not already prefixed."""
    prefix = settings.dynamo_table_prefix
    if name.startswith(prefix):
        return name
    return f"{prefix}{name}"


def get_table(name: str):
    """Get a DynamoDB table by name (auto-prefixed with osr_)."""
    return _get_resource().Table(_table_name(name))


def put_item(table_name: str, item: dict[str, Any]) -> None:
    """Put an item into a DynamoDB table."""
    table = get_table(table_name)
    # Convert floats to Decimal (DynamoDB requirement)
    cleaned = _convert_floats(item)
    table.put_item(Item=cleaned)
    logger.debug("dynamo_put", table=_table_name(table_name), pk=next(iter(item.values())))


def get_item(table_name: str, key: dict[str, Any]) -> dict[str, Any] | None:
    """Get an item from a DynamoDB table."""
    table = get_table(table_name)
    response = table.get_item(Key=key)
    return response.get("Item")


def query_items(
    table_name: str,
    key_condition: Any,
    *,
    index_name: str | None = None,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    """Query items from a DynamoDB table."""
    table = get_table(table_name)
    kwargs: dict[str, Any] = {"KeyConditionExpression": key_condition}
    if index_name:
        kwargs["IndexName"] = index_name
    if limit:
        kwargs["Limit"] = limit
    response = table.query(**kwargs)
    return response.get("Items", [])


def scan_items(table_name: str, *, filter_expression: Any | None = None, limit: int | None = None) -> list[dict[str, Any]]:
    """Scan all items from a DynamoDB table."""
    table = get_table(table_name)
    kwargs: dict[str, Any] = {}
    if filter_expression:
        kwargs["FilterExpression"] = filter_expression
    if limit:
        kwargs["Limit"] = limit
    response = table.scan(**kwargs)
    return response.get("Items", [])


def update_item(
    table_name: str,
    key: dict[str, Any],
    updates: dict[str, Any],
) -> None:
    """Update specific attributes of an item."""
    table = get_table(table_name)
    expressions = []
    names = {}
    values = {}
    for i, (attr, val) in enumerate(updates.items()):
        placeholder_name = f"#attr{i}"
        placeholder_val = f":val{i}"
        expressions.append(f"{placeholder_name} = {placeholder_val}")
        names[placeholder_name] = attr
        values[placeholder_val] = _convert_floats(val) if isinstance(val, (dict, list)) else (Decimal(str(val)) if isinstance(val, float) else val)
    table.update_item(
        Key=key,
        UpdateExpression="SET " + ", ".join(expressions),
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
    )


def delete_item(table_name: str, key: dict[str, Any]) -> None:
    """Delete an item from a DynamoDB table."""
    table = get_table(table_name)
    table.delete_item(Key=key)


def batch_put(table_name: str, items: list[dict[str, Any]]) -> None:
    """Batch write items to a DynamoDB table (max 25 per batch)."""
    table = get_table(table_name)
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=_convert_floats(item))
    logger.info("dynamo_batch_put", table=_table_name(table_name), count=len(items))


def now_iso() -> str:
    """Current UTC timestamp in ISO format."""
    return datetime.now(timezone.utc).isoformat()


def _convert_floats(obj: Any) -> Any:
    """Recursively convert floats to Decimal for DynamoDB compatibility."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: _convert_floats(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_convert_floats(v) for v in obj]
    return obj
