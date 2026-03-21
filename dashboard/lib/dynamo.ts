import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
const docClient = DynamoDBDocumentClient.from(client)

const TABLE_PREFIX = 'osr_'

function tableName(name: string): string {
  return name.startsWith(TABLE_PREFIX) ? name : `${TABLE_PREFIX}${name}`
}

export async function scanTable(name: string, limit?: number): Promise<Record<string, any>[]> {
  try {
    const params: any = { TableName: tableName(name) }
    if (limit) params.Limit = limit
    const result = await docClient.send(new ScanCommand(params))
    return result.Items || []
  } catch (error: any) {
    console.error(`DynamoDB scan error on ${tableName(name)}:`, error.message)
    return []
  }
}

export async function getItem(name: string, key: Record<string, any>): Promise<Record<string, any> | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: tableName(name),
      Key: key,
    }))
    return result.Item || null
  } catch (error: any) {
    console.error(`DynamoDB get error on ${tableName(name)}:`, error.message)
    return null
  }
}

export async function putItem(name: string, item: Record<string, any>): Promise<boolean> {
  try {
    await docClient.send(new PutCommand({
      TableName: tableName(name),
      Item: item,
    }))
    return true
  } catch (error: any) {
    console.error(`DynamoDB put error on ${tableName(name)}:`, error.message)
    return false
  }
}

export async function updateItemField(
  name: string,
  key: Record<string, any>,
  field: string,
  value: any
): Promise<boolean> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: tableName(name),
      Key: key,
      UpdateExpression: `SET #f = :v`,
      ExpressionAttributeNames: { '#f': field },
      ExpressionAttributeValues: { ':v': value },
    }))
    return true
  } catch (error: any) {
    console.error(`DynamoDB update error on ${tableName(name)}:`, error.message)
    return false
  }
}

export async function queryByPartition(
  name: string,
  partitionKey: string,
  partitionValue: string,
  options?: { limit?: number; scanForward?: boolean }
): Promise<Record<string, any>[]> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: tableName(name),
      KeyConditionExpression: `#pk = :val`,
      ExpressionAttributeNames: { '#pk': partitionKey },
      ExpressionAttributeValues: { ':val': partitionValue },
      Limit: options?.limit,
      ScanIndexForward: options?.scanForward ?? false,
    }))
    return result.Items || []
  } catch (error: any) {
    console.error(`DynamoDB query error on ${tableName(name)}:`, error.message)
    return []
  }
}
