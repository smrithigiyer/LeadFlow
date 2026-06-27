# Leads Backend — Node.js + Express + MongoDB

REST API for the Lead Management System.

---

## Project Structure

```
leads-backend/
├── src/
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── controllers/
│   │   ├── leadController.js   # Lead CRUD + stats + CSV import/export
│   │   └── followUpController.js
│   ├── middleware/
│   │   ├── validate.js         # express-validator error collector
│   │   ├── errorHandler.js     # global error handler
│   │   └── notFound.js
│   ├── models/
│   │   ├── Lead.js
│   │   └── FollowUp.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── leadRoutes.js
│   │   └── followUpRoutes.js
│   ├── utils/
│   │   ├── apiResponse.js      # successResponse / errorResponse helpers
│   │   └── logger.js           # Winston logger
│   └── server.js               # Entry point
├── logs/                       # Auto-created log files
├── .env.example
├── package.json
└── README.md
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Start (development with auto-reload)
npm run dev

# 4. Start (production)
npm start
```

---

## Environment Variables

| Variable        | Default                              | Description                  |
|-----------------|--------------------------------------|------------------------------|
| `PORT`          | `5000`                               | Server port                  |
| `NODE_ENV`      | `development`                        | Environment                  |
| `MONGO_URI`     | `mongodb://localhost:27017/leads_db` | MongoDB connection string    |
| `JWT_SECRET`    | —                                    | Secret for JWT signing       |
| `JWT_EXPIRES_IN`| `7d`                                 | JWT expiry duration          |
| `CORS_ORIGIN`   | `*`                                  | Allowed CORS origin(s)       |

---

## API Reference

Base URL: `http://localhost:5000`

### Health Check
| Method | Endpoint    |
|--------|-------------|
| GET    | `/health`   |

---

### Leads

| Method | Endpoint                | Description                  |
|--------|-------------------------|------------------------------|
| GET    | `/leads`                | List leads (paginated)       |
| GET    | `/leads/stats`          | Status counts & totals       |
| GET    | `/leads/export`         | Download leads as CSV        |
| GET    | `/leads/:id`            | Single lead (with follow-ups)|
| POST   | `/leads`                | Create a lead                |
| PUT    | `/leads/:id`            | Full update                  |
| PATCH  | `/leads/:id/status`     | Update status only           |
| DELETE | `/leads/:id`            | Soft-delete                  |
| POST   | `/leads/import`         | Bulk import from CSV file    |

#### Query params for GET /leads
| Param    | Type   | Description                          |
|----------|--------|--------------------------------------|
| `page`   | number | Page number (default: 1)             |
| `limit`  | number | Items per page, max 100 (default: 10)|
| `search` | string | Search name/email/phone/company      |
| `status` | string | Filter by status                     |
| `source` | string | Filter by source                     |
| `from`   | ISO date | Filter createdAt ≥ from            |
| `to`     | ISO date | Filter createdAt ≤ to              |
| `sort`   | string | Sort field (default: `-createdAt`)   |

#### Lead object
```json
{
  "_id": "665abc123...",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91 9876543210",
  "company": "Acme Corp",
  "source": "website",
  "status": "new",
  "notes": "Interested in enterprise plan",
  "createdAt": "2025-06-01T10:00:00.000Z",
  "updatedAt": "2025-06-01T10:00:00.000Z"
}
```

#### Valid status values
`new` | `contacted` | `interested` | `meeting_scheduled` | `converted` | `lost`

#### Valid source values
`website` | `referral` | `social_media` | `cold_call` | `email_campaign` | `trade_show` | `other`

#### CSV Import
`POST /leads/import` — multipart/form-data, field name: `file`

Expected CSV columns (case-insensitive):
`name`, `email`, `phone`, `company`, `source`, `status`, `notes`

---

### Follow-ups

| Method | Endpoint                        | Description                        |
|--------|---------------------------------|------------------------------------|
| GET    | `/leads/:leadId/followups`      | All follow-ups for a lead          |
| POST   | `/leads/:leadId/followups`      | Create follow-up for a lead        |
| GET    | `/followups`                    | All follow-ups (with filters)      |
| GET    | `/followups/:id`                | Single follow-up                   |
| PUT    | `/followups/:id`                | Full update                        |
| PATCH  | `/followups/:id/outcome`        | Update outcome only                |
| DELETE | `/followups/:id`                | Soft-delete                        |

#### Follow-up object
```json
{
  "_id": "665def456...",
  "lead": { "_id": "...", "name": "John Doe", "email": "..." },
  "type": "call",
  "scheduledAt": "2025-06-05T14:00:00.000Z",
  "outcome": "pending",
  "notes": "Discuss pricing",
  "createdAt": "2025-06-01T10:00:00.000Z"
}
```

#### Valid type values
`call` | `email` | `meeting` | `demo` | `other`

#### Valid outcome values
`pending` | `completed` | `no_answer` | `rescheduled` | `cancelled`

---

### Response format

**Success**
```json
{
  "success": true,
  "message": "Leads fetched",
  "data": [...],
  "meta": { "total": 45, "page": 1, "limit": 10, "totalPages": 5 }
}
```

**Error**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": { "email": "Enter a valid email address" }
}
```
