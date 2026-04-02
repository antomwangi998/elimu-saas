// ============================================================
// ElimuSaaS — Main Server Entry Point
// ============================================================
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const { tenantMiddleware } = require('./middleware/tenant');
const { authMiddleware } = require('./middleware/auth');

// ── Route Imports ────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const superAdminRoutes = require('./routes/superadmin');
const schoolRoutes = require('./routes/schools');
const studentRoutes = require('./routes/students');
const staffRoutes = require('./routes/staff');
const academicsRoutes = require('./routes/academics');
const examsRoutes = require('./routes/exams');
const gradesRoutes = require('./routes/grades');
const feesRoutes = require('./routes/fees');
const paymentsRoutes = require('./routes/payments');
const subscriptionRoutes = require('./routes/subscriptions');
const attendanceRoutes = require('./routes/attendance');
const communicationRoutes = require('./routes/communication');
const clubsRoutes = require('./routes/clubs');
const documentsRoutes = require('./routes/documents');
const reportsRoutes = require('./routes/reports');
const analyticsRoutes = require('./routes/analytics');
const leaveoutRoutes = require('./routes/leaveout');
const newsletterRoutes = require('./routes/newsletters');
const certificatesRoutes = require('./routes/certificates');
const settingsRoutes = require('./routes/settings');
const dashboardRoutes = require('./routes/dashboard');
const rankingsRoutes = require('./routes/rankings');
const alumniRoutes = require('./routes/alumni');
const notificationsRoutes = require('./routes/notifications');
const libraryRoutes = require('./routes/library');
const parentRoutes = require('./routes/parent');
const curriculumRoutes = require('./routes/curriculum');
const registerRoutes = require('./routes/register');
const sportsRoutes = require('./routes/sports');
const roleDashboardRoutes = require('./routes/role-dashboard');
const deanRoutes = require('./routes/dean');
const timetableRoutes = require('./routes/timetable');
const admissionsRoutes = require('./routes/admissions');
const clubSubsystemRoutes = require('./routes/club-subsystem');
const aiRoutes = require('./routes/ai');
const mpesaAutoRoutes = require('./routes/mpesa-auto');
const gamificationRoutes = require('./routes/gamification');
const assignmentsRoutes = require('./routes/assignments');
const resourcesRoutes = require('./routes/resources');
const timelineRoutes = require('./routes/timeline');
const messagingRoutes = require('./routes/messaging');
const schoolProfileRoutes = require('./routes/school-profile');
const threadsRoutes       = require('./routes/threads');
const searchRoutes        = require('./routes/search');
const auditRoutes         = require('./routes/audit');
const onlineExamRoutes    = require('./routes/online-exams');
const bulkExportRoutes    = require('./routes/bulk-export');
const questionBankRoutes  = require('./routes/question-bank');
const billingRoutes        = require('./routes/billing');
const storekeeperRoutes    = require('./routes/storekeeper');
const templatesRoutes      = require('./routes/templates');
const cbcRoutes            = require('./routes/cbc');
const payrollRoutes        = require('./routes/payroll');
const labRoutes            = require('./routes/lab');
const messagingChannels    = require('./routes/messaging-channels');
const behaviourRoutes      = require('./routes/behaviour');
const auditLogRoutes       = require('./routes/audit-log');
const feeStructureRoutes   = require('./routes/fee-structure');
const schoolSettingsRoutes = require('./routes/school-settings');
const widgetRoutes         = require('./routes/widgets');
const hostelRoutes         = require('./routes/hostel');
const transportRoutes      = require('./routes/transport');
const canteenRoutes        = require('./routes/canteen');
const healthRoutes         = require('./routes/health');
const assetRoutes          = require('./routes/assets');
const visitorRoutes        = require('./routes/visitors');
const noticeRoutes         = require('./routes/notices');
const bursaryRoutes        = require('./routes/bursary');
const wellnessRoutes       = require('./routes/wellness');
const careerRoutes         = require('./routes/career');
const portfolioRoutes      = require('./routes/portfolio');
const tutoringRoutes       = require('./routes/tutoring');
const pollRoutes           = require('./routes/polls');
const brandingRoutes       = require('./routes/branding');
const aiPredRoutes         = require('./routes/ai-predictions');

const app = express();
const server = http.createServer(app);

// ── Socket.IO Real-time ──────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io);

// ── Security Middleware ───────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    const allowed = process.env.ALLOWED_ORIGINS?.split(',') || [];
    // Always allow onrender.com, localhost, and any explicitly listed origins
    if (
      allowed.includes(origin) ||
      origin.endsWith('.onrender.com') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      process.env.NODE_ENV !== 'production'
    ) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now — restrict via ALLOWED_ORIGINS env var
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-School-ID', 'X-Tenant-Code'],
}));

// ── Rate Limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many login attempts, please try again in 15 minutes.' },
});

// ── General Middleware ────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ── Static Files ──────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// Serve frontend static files
const frontendPath = path.join(__dirname, '../../frontend');
if (require('fs').existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
}

// ── Health Check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ── API Routes ────────────────────────────────────────────────
// Public routes (no auth)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/subscriptions/webhook', subscriptionRoutes); // Webhook before JSON parse

// Super Admin routes (platform-level)
app.use('/api/superadmin', authMiddleware, superAdminRoutes);

// School-scoped routes (multi-tenant)
app.use('/api/schools', authMiddleware, schoolRoutes);
app.use('/api/dashboard', authMiddleware, tenantMiddleware, dashboardRoutes);
app.use('/api/students', authMiddleware, tenantMiddleware, studentRoutes);
app.use('/api/staff', authMiddleware, tenantMiddleware, staffRoutes);
app.use('/api/academics', authMiddleware, tenantMiddleware, academicsRoutes);
app.use('/api/exams', authMiddleware, tenantMiddleware, examsRoutes);
app.use('/api/grades', authMiddleware, tenantMiddleware, gradesRoutes);
app.use('/api/fees', authMiddleware, tenantMiddleware, feesRoutes);
app.use('/api/payments', authMiddleware, tenantMiddleware, paymentsRoutes);
app.use('/api/subscriptions', authMiddleware, subscriptionRoutes);
app.use('/api/attendance', authMiddleware, tenantMiddleware, attendanceRoutes);
app.use('/api/communication', authMiddleware, tenantMiddleware, communicationRoutes);
app.use('/api/clubs', authMiddleware, tenantMiddleware, clubsRoutes);
app.use('/api/documents', authMiddleware, tenantMiddleware, documentsRoutes);
app.use('/api/reports', authMiddleware, tenantMiddleware, reportsRoutes);
app.use('/api/analytics', authMiddleware, tenantMiddleware, analyticsRoutes);
app.use('/api/leaveout', authMiddleware, tenantMiddleware, leaveoutRoutes);
app.use('/api/newsletters', authMiddleware, tenantMiddleware, newsletterRoutes);
app.use('/api/certificates', authMiddleware, tenantMiddleware, certificatesRoutes);
app.use('/api/settings', authMiddleware, tenantMiddleware, settingsRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/alumni', authMiddleware, tenantMiddleware, alumniRoutes);
app.use('/api/notifications', authMiddleware, tenantMiddleware, notificationsRoutes);
app.use('/api/library', authMiddleware, tenantMiddleware, libraryRoutes);
app.use('/api/parent', authMiddleware, tenantMiddleware, parentRoutes);
app.use('/api/curriculum', authMiddleware, tenantMiddleware, curriculumRoutes);
app.use('/api/register', authMiddleware, tenantMiddleware, registerRoutes);
app.use('/api/sports', authMiddleware, tenantMiddleware, sportsRoutes);
app.use('/api/me/dashboard', authMiddleware, tenantMiddleware, roleDashboardRoutes);
app.use('/api/dean', authMiddleware, tenantMiddleware, deanRoutes);
app.use('/api/timetable', authMiddleware, tenantMiddleware, timetableRoutes);
app.use('/api/admissions', authMiddleware, tenantMiddleware, admissionsRoutes);
app.use('/api/club-subsystem', authMiddleware, tenantMiddleware, clubSubsystemRoutes);
app.use('/api/ai', authMiddleware, tenantMiddleware, aiRoutes);
app.use('/api/mpesa', authMiddleware, tenantMiddleware, mpesaAutoRoutes);
app.use('/api/mpesa/callback', mpesaAutoRoutes); // Public callback
app.use('/api/gamification', authMiddleware, tenantMiddleware, gamificationRoutes);
app.use('/api/assignments', authMiddleware, tenantMiddleware, assignmentsRoutes);
app.use('/api/resources', authMiddleware, tenantMiddleware, resourcesRoutes);
app.use('/api/timeline', authMiddleware, tenantMiddleware, timelineRoutes);
app.use('/api/messaging', authMiddleware, tenantMiddleware, messagingRoutes);
app.use('/api/school-profile', authMiddleware, tenantMiddleware, schoolProfileRoutes);
app.use('/api/threads',       authMiddleware, tenantMiddleware, threadsRoutes);
app.use('/api/search',        authMiddleware, tenantMiddleware, searchRoutes);
app.use('/api/audit',         authMiddleware, tenantMiddleware, auditRoutes);
app.use('/api/online-exams',  authMiddleware, tenantMiddleware, onlineExamRoutes);
app.use('/api/bulk-export',   authMiddleware, tenantMiddleware, bulkExportRoutes);
app.use('/api/question-bank', authMiddleware, tenantMiddleware, questionBankRoutes);
app.use('/api/billing',       authMiddleware, tenantMiddleware, billingRoutes);
app.use('/api/storekeeper',   authMiddleware, tenantMiddleware, storekeeperRoutes);
app.use('/api/templates',     authMiddleware, tenantMiddleware, templatesRoutes);
app.use('/api/cbc',           authMiddleware, tenantMiddleware, cbcRoutes);
app.use('/api/payroll',       authMiddleware, tenantMiddleware, payrollRoutes);
app.use('/api/lab',           authMiddleware, tenantMiddleware, labRoutes);
app.use('/api/channels',      authMiddleware, tenantMiddleware, messagingChannels);
app.use('/api/channels/whatsapp/webhook', messagingChannels);
app.use('/api/behaviour',     authMiddleware, tenantMiddleware, behaviourRoutes);
app.use('/api/audit-log',     authMiddleware, tenantMiddleware, auditLogRoutes);
app.use('/api/fee-structure', authMiddleware, tenantMiddleware, feeStructureRoutes);
app.use('/api/school-settings', authMiddleware, tenantMiddleware, schoolSettingsRoutes);
app.use('/api/widgets',       authMiddleware, tenantMiddleware, widgetRoutes);
app.use('/api/hostel',        authMiddleware, tenantMiddleware, hostelRoutes);
app.use('/api/transport',     authMiddleware, tenantMiddleware, transportRoutes);
app.use('/api/canteen',       authMiddleware, tenantMiddleware, canteenRoutes);
app.use('/api/health',        authMiddleware, tenantMiddleware, healthRoutes);
app.use('/api/assets',        authMiddleware, tenantMiddleware, assetRoutes);
app.use('/api/visitors',      authMiddleware, tenantMiddleware, visitorRoutes);
app.use('/api/notices',       authMiddleware, tenantMiddleware, noticeRoutes);
app.use('/api/bursary',       authMiddleware, tenantMiddleware, bursaryRoutes);
app.use('/api/wellness',      authMiddleware, tenantMiddleware, wellnessRoutes);
app.use('/api/career',        authMiddleware, tenantMiddleware, careerRoutes);
app.use('/api/portfolio',     authMiddleware, tenantMiddleware, portfolioRoutes);
app.use('/api/tutoring',      authMiddleware, tenantMiddleware, tutoringRoutes);
app.use('/api/polls',         authMiddleware, tenantMiddleware, pollRoutes);
app.use('/api/branding',      authMiddleware, tenantMiddleware, brandingRoutes);
app.use('/api/ai-predictions',authMiddleware, tenantMiddleware, aiPredRoutes);
app.use('/api/branding/public', brandingRoutes);

// ── Socket.IO Connection Handler ─────────────────────────────
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join-school', (schoolId) => {
    socket.join(`school-${schoolId}`);
  });

  socket.on('join-class', ({ schoolId, classId }) => {
    socket.join(`school-${schoolId}-class-${classId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// ── 404 Handler ───────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ──────────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

// Splits a SQL file into individual statements, correctly handling
// dollar-quoted PL/pgSQL bodies ($$...$$) which contain semicolons.
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let i = 0;
  while (i < sql.length) {
    // Detect start of a dollar-quote tag, e.g. $$ or $func$
    if (sql[i] === '$') {
      let tagEnd = sql.indexOf('$', i + 1);
      if (tagEnd !== -1) {
        const tag = sql.slice(i, tagEnd + 1); // e.g. "$$" or "$func$"
        // Only treat as dollar-quote if tag contains only letters/digits/underscores
        if (/^\$[A-Za-z0-9_]*\$$/.test(tag)) {
          const closeIdx = sql.indexOf(tag, tagEnd + 1);
          if (closeIdx !== -1) {
            current += sql.slice(i, closeIdx + tag.length);
            i = closeIdx + tag.length;
            continue;
          }
        }
      }
    }
    // Detect single-line comment
    if (sql[i] === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      const end = nl === -1 ? sql.length : nl + 1;
      current += sql.slice(i, end);
      i = end;
      continue;
    }
    // Statement boundary
    if (sql[i] === ';') {
      current += ';';
      const stmt = current.trim();
      if (stmt && stmt !== ';') statements.push(stmt);
      current = '';
      i++;
      continue;
    }
    current += sql[i];
    i++;
  }
  const last = current.trim();
  if (last) statements.push(last);
  return statements;
}

async function runMigrations() {
  const fs = require('fs');
  const path = require('path');
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const { rows } = await client.query('SELECT id FROM _migrations WHERE filename=$1', [file]);
      if (rows.length > 0) { logger.info(`⏭  Already run: ${file}`); continue; }
      logger.info(`▶  Running: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const statements = splitSqlStatements(sql);
      await client.query('BEGIN');
      for (const stmt of statements) {
        await client.query(stmt);
      }
      await client.query('INSERT INTO _migrations(filename) VALUES($1)', [file]);
      await client.query('COMMIT');
      logger.info(`✅ Done: ${file}`);
    }
    logger.info('🎉 All migrations up to date');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('❌ Migration failed:', err.message);
    if (err.position) logger.error('   Near position:', err.position);
    if (err.query) logger.error('   Statement:', err.query?.slice(0, 200));
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function seedSuperAdmin() {
  const bcrypt = require('bcryptjs');
  const { query } = require('./config/database');
  try {
    // Create superadmin user if not exists
    const { rows } = await query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      ['superadmin@elimusaas.com']
    );
    if (rows.length === 0) {
      const hash = await bcrypt.hash('SuperAdmin@2025!', 12);
      await query(
        `INSERT INTO users(email, password_hash, role, first_name, last_name, is_active, is_email_verified)
         VALUES($1,$2,'super_admin','Super','Admin',true,true)`,
        ['superadmin@elimusaas.com', hash]
      );
      logger.info('✅ Superadmin seeded: superadmin@elimusaas.com / SuperAdmin@2025!');
    }
    // Create demo school if not exists
    const { rows: schools } = await query(
      `SELECT id FROM schools WHERE school_code = $1 LIMIT 1`,
      ['DEMO001']
    );
    let schoolId;
    if (schools.length === 0) {
      const { rows: newSchool } = await query(
        `INSERT INTO schools(school_code, name, short_name, email, phone, is_active, is_verified)
         VALUES('DEMO001','Demo School','Demo','demo@elimusaas.com','+254700000000',true,true)
         RETURNING id`
      );
      schoolId = newSchool[0].id;
      logger.info('✅ Demo school created: DEMO001');
    } else {
      schoolId = schools[0].id;
    }
    // Create school admin if not exists
    const { rows: adminRows } = await query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      ['admin@demo.elimusaas.com']
    );
    if (adminRows.length === 0) {
      const hash = await bcrypt.hash('Admin@2025!', 12);
      await query(
        `INSERT INTO users(school_id, email, password_hash, role, first_name, last_name, is_active, is_email_verified)
         VALUES($1,$2,$3,'school_admin','School','Admin',true,true)`,
        [schoolId, 'admin@demo.elimusaas.com', hash]
      );
      logger.info('✅ Demo admin seeded: admin@demo.elimusaas.com / Admin@2025!');
    }
  } catch (err) {
    logger.error('Seed error (non-fatal):', err.message);
  }
}

async function startServer() {
  try {
    await connectDB();
    logger.info('✅ PostgreSQL connected');

    await runMigrations();
    await seedSuperAdmin();

    await connectRedis().catch(err => logger.warn('Redis skipped:', err.message));
    logger.info('✅ Redis connected (or skipped)');

    server.listen(PORT, () => {
      logger.info(`🚀 ElimuSaaS running on port ${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV}`);
      logger.info(`   API: http://localhost:${PORT}/api`);
      logger.info(`   Health: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Init automation
const { initAutomation } = require('./services/automationService');

startServer().then(() => {
  initAutomation();
}).catch(console.error);

module.exports = { app, server, io };
