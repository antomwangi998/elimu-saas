# 🏫 ElimuSaaS — Enterprise School Management Platform

> **Multi-tenant SaaS platform** that digitizes all school operations: academics, finance, communication, student life, and administration. Built to surpass Zeraki Analytics.

---

## 🚀 Live Demo

| Portal | URL |
|--------|-----|
| Frontend | `https://elimu-saas-frontend.onrender.com` |
| API | `https://elimu-saas-api.onrender.com` |
| Health | `https://elimu-saas-api.onrender.com/health` |

**Demo Credentials:**
- Super Admin: `superadmin@elimusaas.com` / `SuperAdmin@2025!`

---

## 📦 Project Structure

```
elimu-saas/
├── frontend/               # Vanilla HTML/CSS/JS PWA
│   ├── index.html          # Main app shell
│   ├── css/main.css        # Complete design system
│   ├── js/
│   │   ├── app.js          # Core: Router, API client, Auth, State
│   │   ├── pages/          # All page modules
│   │   │   ├── dashboard.js
│   │   │   ├── students.js
│   │   │   ├── fees.js
│   │   │   └── all-pages.js  # All other pages
│   │   ├── utils/charts.js
│   │   └── init.js         # Route registration
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker
│
├── backend/                # Node.js + Express API
│   ├── src/
│   │   ├── server.js       # Entry point + Socket.IO
│   │   ├── config/
│   │   │   ├── database.js # PostgreSQL pool
│   │   │   ├── redis.js    # Redis cache + sessions
│   │   │   └── logger.js   # Winston logging
│   │   ├── middleware/
│   │   │   ├── auth.js     # JWT + RBAC
│   │   │   ├── tenant.js   # Multi-tenant isolation
│   │   │   └── errorHandler.js
│   │   ├── controllers/    # Business logic
│   │   │   ├── authController.js
│   │   │   ├── academicsController.js
│   │   │   ├── feesController.js
│   │   │   ├── studentsController.js
│   │   │   ├── analyticsController.js
│   │   │   ├── clubsController.js
│   │   │   ├── leaveoutController.js
│   │   │   ├── certificatesController.js
│   │   │   ├── communicationController.js
│   │   │   ├── attendanceController.js
│   │   │   └── superAdminController.js
│   │   ├── routes/         # Express routers
│   │   ├── services/
│   │   │   ├── mpesaService.js    # M-Pesa Daraja API
│   │   │   ├── emailService.js    # Nodemailer
│   │   │   ├── smsService.js      # Africa's Talking
│   │   │   └── pdfService.js      # Puppeteer PDF gen
│   │   └── migrations/
│   │       ├── 001_initial_schema.sql   # Full DB schema
│   │       └── run.js               # Migration runner
│   ├── .env.example
│   └── package.json
│
├── render.yaml             # Render.com deployment config
└── README.md
```

---

## ✨ Features

### 🏢 Multi-Tenant SaaS
- Each school is isolated by `school_id`
- Unique school codes, branding, and settings
- Subscription-based access with soft/hard lock

### 📊 Academic System
- Classes, streams, subjects management
- Exam series with approval chain (Teacher → HOD → Deputy → Principal)
- Mark entry with auto-grading (KCSE scale)
- Class broadsheets with positions and statistics
- PDF report cards with remarks
- AI-generated teacher remarks

### 💰 Finance System
- Flexible fee structures (by class/term)
- Fee items: tuition, boarding, transport, exams, etc.
- Discounts, scholarships, penalties
- M-Pesa STK Push & Paybill integration
- Cash and bank payment recording
- Auto-generated receipts (PDF)
- Fee statements and defaulters report
- Real-time payment via M-Pesa callback

### 📅 Attendance
- Daily class attendance marking
- Per-subject attendance
- Automatic SMS alerts to parents for absent students
- Monthly summary reports
- Chronic absentees detection

### 💬 Communication
- Bulk SMS via Africa's Talking
- Email via SMTP/Gmail
- In-app notifications
- Message targeting: all parents, specific class, individuals

### 🏅 Clubs & Co-curricular
- Create clubs, sports teams, societies
- Assign patrons, chairperson, secretary, treasurer
- Member management and participation tracking
- Club events and competition records

### 📄 Leave-Out System (Boarding)
- Student leave requests with full details
- 3-level approval: Class Teacher → Deputy → Principal
- Late return tracking and alerts
- Printable leave-out PDF sheet

### 🎖️ Certificates
- Multiple certificate types (academic, sports, leadership, participation)
- Custom HTML templates per school
- Dynamic fields (name, date, position)
- PDF download
- Batch generation for events

### 📬 Newsletters
- Rich content editor
- Images, events, announcements
- PDF export
- Email to all parents

### 📈 Analytics & Reports
- Academic performance trends by class/subject
- Grade distribution charts
- Top performers & weak student detection
- Financial analytics (monthly collection, by method, outstanding)
- Attendance trend reports

### 🧠 AI Features
- Auto-generate teacher remarks based on performance
- Weak student detection (failing 2+ subjects)
- At-risk student identification

### 🎓 Alumni System
- Track graduates: KCSE grade, university, career
- Contact information
- Achievements and achievements

### 🔐 Security
- JWT with refresh token rotation
- Role-based access control (9 roles)
- Account lockout after failed attempts
- Audit logs for all key actions
- Multi-tenant data isolation
- Redis session blacklisting

---

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### 1. Clone & Setup

```bash
git clone https://github.com/yourusername/elimu-saas.git
cd elimu-saas
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials

npm install
node src/migrations/run.js   # Run migrations
npm run dev                   # Start dev server (port 5000)
```

### 3. Frontend Setup

```bash
cd frontend
# Open index.html directly OR serve with:
npx serve . -p 3000
# Visit http://localhost:3000
```

### 4. First Login

Use the super admin credentials from your `.env`:
- Email: `superadmin@elimusaas.com`
- Password: `SuperAdmin@2025!`

Then onboard your first school from the Super Admin dashboard.

---

## 🚀 Deploy to Render

### One-Click Deploy

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your GitHub repo
4. Render reads `render.yaml` and creates all services automatically

### Manual Deploy Steps

#### Backend (Web Service)
1. New → Web Service → Connect repo
2. Root Directory: `backend`
3. Build: `npm install`
4. Start: `npm start`
5. Add environment variables from `.env.example`

#### Database (PostgreSQL)
1. New → PostgreSQL
2. Copy connection string to backend env as `DATABASE_URL`
3. Run migrations: use Render Shell → `node src/migrations/run.js`

#### Redis
1. New → Redis
2. Copy URL to backend env as `REDIS_URL`

#### Frontend (Static Site)
1. New → Static Site → Connect repo
2. Root Directory: `frontend`
3. No build command needed
4. Publish Directory: `.`
5. Add rewrite rule: `/* → /index.html`

### Environment Variables (Required on Render)

```
NODE_ENV=production
DATABASE_URL=<from Render PostgreSQL>
REDIS_URL=<from Render Redis>
JWT_SECRET=<generate random 64+ char string>
JWT_REFRESH_SECRET=<generate random 64+ char string>
MPESA_CONSUMER_KEY=<your Daraja key>
MPESA_CONSUMER_SECRET=<your Daraja secret>
MPESA_SHORTCODE=<your shortcode>
MPESA_PASSKEY=<your passkey>
MPESA_CALLBACK_URL=https://elimu-saas-api.onrender.com/api/payments/mpesa/callback
AT_API_KEY=<Africa's Talking key>
AT_USERNAME=<Africa's Talking username>
SMTP_HOST=smtp.gmail.com
SMTP_USER=<your gmail>
SMTP_PASS=<gmail app password>
FRONTEND_URL=https://elimu-saas-frontend.onrender.com
ALLOWED_ORIGINS=https://elimu-saas-frontend.onrender.com
```

---

## 👥 User Roles & Permissions

| Role | Access |
|------|--------|
| `super_admin` | Full platform access, onboard schools |
| `school_admin` | Full school access |
| `principal` | All school modules |
| `deputy_principal` | Most modules, approve marks/leave |
| `hod` | Subject/marks management |
| `teacher` | Own classes, mark attendance & grades |
| `bursar` | Finance, fees, payments only |
| `student` | Own records, report card |
| `parent` | Child's records, fee statements |
| `alumni` | Alumni portal |

---

## 🔌 Integrations

| Service | Purpose |
|---------|---------|
| **M-Pesa Daraja** | STK Push + Paybill for fee payments |
| **Africa's Talking** | Bulk SMS to parents |
| **Nodemailer/SMTP** | Email notifications, newsletters |
| **Puppeteer** | PDF generation (reports, certificates) |
| **Stripe** | International card payments |
| **Socket.IO** | Real-time notifications |

---

## 📄 License

MIT License — Free to use, modify, and deploy.

---

## 📞 Support

- Email: support@elimusaas.com
- Documentation: https://docs.elimusaas.com
- Issues: GitHub Issues

---

Built with ❤️ for Kenyan schools and beyond.
