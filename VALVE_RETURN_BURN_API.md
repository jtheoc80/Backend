# Valve Return and Burn API Documentation

## Overview

The Valve Return and Burn API provides functionality for managing valve returns, token burning, and ownership restoration in the ValveChain ecosystem. This API supports the complete workflow from return request creation to admin approval and final burn/restore operations.

## Key Features

- **Return Request Management**: Create and track valve return requests
- **Admin Approval Workflow**: Requires administrator approval for all burn/restore operations
- **Token Burning**: Permanently remove tokens for damaged or non-resellable valves
- **Ownership Restoration**: Restore ownership for valves that can be resold
- **Return Fee Processing**: Support for negotiated return fees with 0.5% transaction fees
- **Comprehensive Audit Logging**: All operations are logged with reasons and outcomes

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Admin-only operations require users with `role: 'admin'`.

## Endpoints

### 1. Create Return Request

Create a new valve return request.

**Endpoint:** `POST /api/valve-returns`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "valveId": 1,
  "returnType": "damaged",
  "returnReason": "Valve is physically damaged beyond repair",
  "returnFee": 100.00
}
```

**Parameters:**
- `valveId` (integer, required): ID of the valve to return
- `returnType` (string, required): Type of return
  - `damaged`: Valve is physically damaged
  - `not_operable`: Valve is not functioning properly
  - `custom`: Custom order that cannot be resold
  - `not_resellable`: Cannot be resold for other reasons
  - `resellable`: Can be resold after refurbishment
- `returnReason` (string, required): Detailed reason for the return
- `returnFee` (number, optional): Negotiated return fee (default: 0)

**Response (201 Created):**
```json
{
  "message": "Return request created successfully",
  "returnRequest": {
    "id": 1,
    "valve_id": 1,
    "return_type": "damaged",
    "returned_by_id": "dist001",
    "returned_by_type": "distributor",
    "return_reason": "Valve is physically damaged beyond repair",
    "return_fee": 100.00,
    "status": "pending",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid return type or missing required fields
- `404 Not Found`: Valve not found
- `403 Forbidden`: Insufficient permissions

---

### 2. Get Return Requests

Retrieve return requests with optional filtering.

**Endpoint:** `GET /api/valve-returns`

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 10, max: 100)
- `status` (string, optional): Filter by status (pending, approved_for_burn, approved_for_restore, rejected, completed)
- `returnType` (string, optional): Filter by return type
- `returnedById` (string, optional): Filter by returner ID

**Example:** `GET /api/valve-returns?status=pending&page=1&limit=20`

**Response (200 OK):**
```json
{
  "returnRequests": [
    {
      "id": 1,
      "valve_id": 1,
      "valve_id_display": "VLV001",
      "serial_number": "SN123456",
      "model": "Ball Valve Pro",
      "manufacturer_id": "mfg001",
      "return_type": "damaged",
      "status": "pending",
      "return_fee": 100.00,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "limit": 20
  }
}
```

---

### 3. Get Return Request by ID

Retrieve a specific return request.

**Endpoint:** `GET /api/valve-returns/:returnId`

**Response (200 OK):**
```json
{
  "returnRequest": {
    "id": 1,
    "valve_id": 1,
    "valve_id_display": "VLV001",
    "serial_number": "SN123456",
    "model": "Ball Valve Pro",
    "manufacturer_id": "mfg001",
    "return_type": "damaged",
    "returned_by_id": "dist001",
    "returned_by_type": "distributor",
    "return_reason": "Valve is physically damaged beyond repair",
    "return_fee": 100.00,
    "status": "pending",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### 4. Approve Return Request (Admin Only)

Approve or reject a return request.

**Endpoint:** `POST /api/valve-returns/:returnId/approve`

**Required Role:** Admin

**Request Body:**
```json
{
  "approvalType": "approved_for_burn",
  "adminNotes": "Valve confirmed damaged beyond repair"
}
```

**Parameters:**
- `approvalType` (string, required): Approval decision
  - `approved_for_burn`: Approve for token burning
  - `approved_for_restore`: Approve for ownership restoration
  - `rejected`: Reject the return request
- `adminNotes` (string, optional): Administrator notes

**Response (200 OK):**
```json
{
  "message": "Return request approved for burn successfully",
  "returnRequest": {
    "id": 1,
    "status": "approved_for_burn",
    "approved_by": 5,
    "approved_at": "2024-01-15T11:00:00Z"
  },
  "blockchainTransaction": "0xabcdef123456789..."
}
```

---

### 5. Burn Valve Token (Admin Only)

Permanently burn a valve token after return approval.

**Endpoint:** `POST /api/valves/:valveId/burn`

**Required Role:** Admin

**Request Body:**
```json
{
  "burnReason": "Valve confirmed damaged beyond repair",
  "returnFee": 100.00
}
```

**Parameters:**
- `burnReason` (string, required): Detailed reason for burning the token
- `returnFee` (number, optional): Return fee amount (for fee calculation)

**Response (200 OK):**
```json
{
  "message": "Valve token burned successfully",
  "valve": {
    "id": 1,
    "tokenId": "VLV001",
    "burnStatus": {
      "isBurned": true,
      "burnReason": "Valve confirmed damaged beyond repair",
      "burnedAt": "2024-01-15T11:15:00Z",
      "burnedBy": 5
    }
  },
  "feeTransaction": {
    "feeAmount": 0.5,
    "feeRate": 0.005,
    "feeWalletAddress": "0xFEEWALLET123456789...",
    "totalTransactionAmount": 100.5
  },
  "burnResult": {
    "success": true,
    "message": "Valve token burned successfully",
    "burnedAt": "2024-01-15T11:15:00Z"
  }
}
```

---

### 6. Restore Valve Ownership (Admin Only)

Restore ownership of a burned valve for resellable items.

**Endpoint:** `POST /api/valves/:valveId/restore`

**Required Role:** Admin

**Request Body:**
```json
{
  "newOwnerId": "mfg001",
  "newOwnerType": "manufacturer",
  "restoreReason": "Valve refurbished and ready for resale",
  "returnFee": 50.00
}
```

**Parameters:**
- `newOwnerId` (string, required): ID of the new owner
- `newOwnerType` (string, required): Type of new owner (`manufacturer` or `distributor`)
- `restoreReason` (string, required): Reason for ownership restoration
- `returnFee` (number, optional): Return fee amount

**Response (200 OK):**
```json
{
  "message": "Valve ownership restored successfully",
  "valve": {
    "id": 1,
    "tokenId": "VLV001",
    "currentOwner": {
      "id": "mfg001",
      "type": "manufacturer"
    },
    "burnStatus": {
      "isBurned": false,
      "burnReason": null,
      "burnedAt": null,
      "burnedBy": null
    }
  },
  "feeTransaction": {
    "feeAmount": 0.25,
    "feeRate": 0.005,
    "feeWalletAddress": "0xFEEWALLET123456789...",
    "totalTransactionAmount": 50.25
  },
  "restoreResult": {
    "success": true,
    "message": "Valve ownership restored successfully",
    "newOwner": {
      "id": "mfg001",
      "type": "manufacturer"
    }
  }
}
```

## Transaction Fees

All return and burn operations include a **0.5% transaction fee** that is automatically calculated and transferred to the organization's fee wallet. The fee is calculated on the total transaction amount (including any return fees).

**Fee Calculation:**
- Fee Rate: 0.5% (50 basis points)
- Fee Amount = (Transaction Amount + Return Fee) × 0.005
- Fee Wallet: Configurable via `FEE_WALLET_ADDRESS` environment variable

## Workflow Examples

### Complete Burn Workflow

1. **Create Return Request:**
   ```bash
   POST /api/valve-returns
   {
     "valveId": 1,
     "returnType": "damaged",
     "returnReason": "Physical damage to valve body",
     "returnFee": 100.00
   }
   ```

2. **Admin Reviews and Approves:**
   ```bash
   POST /api/valve-returns/1/approve
   {
     "approvalType": "approved_for_burn",
     "adminNotes": "Damage confirmed, proceed with burn"
   }
   ```

3. **Admin Burns Token:**
   ```bash
   POST /api/valves/1/burn
   {
     "burnReason": "Irreparable damage confirmed",
     "returnFee": 100.00
   }
   ```

### Complete Restore Workflow

1. **Create Return Request** (same as above with `returnType: "resellable"`)

2. **Admin Approves for Restore:**
   ```bash
   POST /api/valve-returns/1/approve
   {
     "approvalType": "approved_for_restore",
     "adminNotes": "Valve can be refurbished and resold"
   }
   ```

3. **Admin Restores Ownership:**
   ```bash
   POST /api/valves/1/restore
   {
     "newOwnerId": "mfg001",
     "newOwnerType": "manufacturer",
     "restoreReason": "Refurbished and ready for resale",
     "returnFee": 50.00
   }
   ```

## Error Codes

- `400 Bad Request`: Invalid request parameters or valve state
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions (admin required)
- `404 Not Found`: Valve or return request not found
- `500 Internal Server Error`: Server error during processing

## Audit Logging

All operations are automatically logged to the audit trail with:
- User ID and action performed
- Valve/return request details
- Reason for action
- Transaction amounts and fees
- Blockchain transaction hashes
- Success/failure status

Audit logs can be accessed via the existing `/api/audit_logs` endpoint (admin only).