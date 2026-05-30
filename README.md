# Placement Management System

Enterprise-grade placement portal for engineering colleges.

**Repository:** https://github.com/MsGOLLAL/placement-management-system

Built with **Node.js**, **Express**, **Oracle Database**, and a **Vanilla JS** frontend with Bootstrap 5 and Chart.js.

## Features

- Role-based login (Placement Officer / Student)
- Analytics dashboard with Chart.js visualizations
- Student CRUD with search, filter, sort, pagination
- Company management with card layout
- Job postings with apply functionality
- Application status tracking with colored badges
- Interview scheduling with calendar view
- Reports with PDF, Excel, and Print export
- Oracle stored procedure `GetEligibleStudents` integration
- Oracle trigger `Update_Selection_Status` awareness in UI

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JS, Bootstrap 5, Chart.js, Font Awesome |
| Backend | Node.js, Express.js |
| Database | Oracle Database XE, node-oracledb |

## Project Structure

```
placement-management-system/
├── frontend/          # HTML, CSS, JS pages
├── backend/
│   ├── server.js
│   ├── config/db.js
│   ├── routes/        # REST API routes
│   └── middleware/
├── package.json
└── .env.example
```

## Prerequisites

1. **Node.js** 18+ installed
2. **Oracle Database XE** running with existing schema:
   - PLACEMENT_OFFICER, COMPANY, JOB_POSTING, STUDENTS, APPLICATION, INTERVIEW
   - Trigger: `Update_Selection_Status`
   - Stored Procedure: `GetEligibleStudents`
3. **Oracle Instant Client** (required by node-oracledb on Windows)

## Setup

### 1. Clone / navigate to project

```bash
cd placement-management-system
```

### 2. Configure environment

```bash
copy .env.example .env
```

Edit `.env` with your Oracle credentials:

```env
ORACLE_USER=gollal
ORACLE_PASSWORD=your_password
ORACLE_CONNECT_STRING=localhost:1521/XEPDB1
PORT=3000
DEFAULT_OFFICER_PASSWORD=admin123
DEFAULT_STUDENT_PASSWORD=student123
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the server

```bash
npm start
```

Open **http://localhost:3000** in your browser.

## Demo Login

| Role | Username | Password |
|------|----------|----------|
| Placement Officer | Officer email from `PLACEMENT_OFFICER` table (or Officer ID) | `admin123` |
| Student | USN from `STUDENTS` table (or email) | `student123` |

## API Endpoints

| Module | Endpoints |
|--------|-----------|
| Auth | `POST /api/auth/login` |
| Students | `GET/POST /api/students`, `GET/PUT/DELETE /api/students/:id` |
| Companies | `GET/POST /api/companies`, `PUT/DELETE /api/companies/:id` |
| Jobs | `GET/POST /api/jobs`, `PUT/DELETE /api/jobs/:id` |
| Applications | `GET/POST /api/applications`, `PUT/DELETE /api/applications/:id` |
| Interviews | `GET/POST /api/interviews`, `PUT/DELETE /api/interviews/:id` |
| Reports | `GET /api/reports/eligible-students?jobId=`, `selected-students`, `company-wise`, `branch-wise`, `statistics` |
| Dashboard | `GET /api/dashboard/stats`, `/charts`, `/activities` |

## Database Notes

- **No tables are created** by this application — it uses your existing schema.
- When interview result is set to **Selected**, the Oracle trigger `Update_Selection_Status` automatically updates `APPLICATION.STATUS`.
- The **Eligible Students** report calls the `GetEligibleStudents` stored procedure. If the procedure signature differs, a CGPA-based fallback query is used.

## Viva Talking Points

1. Three-tier architecture: Frontend → Express API → Oracle DB
2. Connection pooling via `node-oracledb`
3. Referential integrity with foreign keys across all tables
4. Business logic in DB: stored procedure + trigger
5. Role-based access control for officers vs students
6. Real-time analytics dashboard with Chart.js

## License

MIT — For educational / DBMS mini project use.
