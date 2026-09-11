# ExpenseTrack — RESTful Expense Tracking API

A multi-user expense tracking REST API built with Flask and SQLAlchemy, featuring token-based authentication and SQL aggregation for spending summaries.

## Tech Stack
- Python, Flask
- SQLAlchemy ORM
- SQLite (local) / PostgreSQL via Neon (production)
- Token-based authentication

## Features
- Normalized relational schema (Users → Categories → Transactions) with foreign-key relationships
- Full CRUD on transactions (Create, Read, Update, Delete)
- Token-based auth: register, login, protected routes
- Summary endpoint with SQL aggregation (GROUP BY, SUM, date filtering)

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/expensetrack.git
cd expensetrack
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python run.py
```

Server runs at `http://127.0.0.1:5000`

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Database connection string | local SQLite file |
| `SECRET_KEY` | Flask secret key | dev default (change in production) |

## API Endpoints

### Auth

**POST /api/register**
```json
Request:  {"username": "chinnu", "password": "test123"}
Response: {"message": "user created", "user_id": 1}
```

**POST /api/login**
```json
Request:  {"username": "chinnu", "password": "test123"}
Response: {"token": "c2b6c218..."}
```

All routes below require header: `Authorization: Bearer <token>`

### Categories

**GET /api/categories**
```json
Response: [{"id": 1, "name": "Groceries"}]
```

**POST /api/categories**
```json
Request:  {"name": "Groceries"}
Response: {"id": 1, "name": "Groceries"}
```

### Transactions

**GET /api/transactions**
Optional query param: `?category_id=1`
```json
Response: [{"id": 1, "amount": 45.5, "description": "Weekly groceries", "date": "2026-09-10", "category_id": 1}]
```

**POST /api/transactions**
```json
Request:  {"amount": 45.5, "description": "Weekly groceries", "category_id": 1, "date": "2026-09-10"}
Response: {"id": 1, "amount": 45.5, "description": "Weekly groceries", "date": "2026-09-10", "category_id": 1}
```

**PUT /api/transactions/\<id\>**
```json
Request:  {"amount": 50.0, "description": "Updated groceries"}
Response: {"id": 1, "amount": 50.0, "description": "Updated groceries", "date": "2026-09-10", "category_id": 1}
```

**DELETE /api/transactions/\<id\>**
```json
Response: {"message": "deleted"}
```

### Summary

**GET /api/summary?year=2026&month=9**
```json
Response: {
  "year": 2026,
  "month": 9,
  "by_category": [{"category": "Groceries", "total": 50.0}]
}
```

## Testing
All endpoints tested manually via PowerShell `Invoke-RestMethod` and Postman. See `/postman` for the exported collection.

## Deployment
Deployed on Render with PostgreSQL (via Neon) using environment-based configuration for `DATABASE_URL` and `SECRET_KEY`.