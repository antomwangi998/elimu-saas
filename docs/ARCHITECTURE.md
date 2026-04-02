# ElimuSaaS Architecture

## Tech Stack
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Cache:** Redis
- **Real-time:** Socket.IO
- **Frontend:** Vanilla JS SPA

## Multi-Tenancy
All data is isolated by `school_id`. The `tenantMiddleware` enforces this on every request.
