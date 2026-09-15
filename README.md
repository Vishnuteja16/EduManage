# 🎓 EduManage - Education Management System

EduManage is a full-stack Education Management System for managing students, courses, enrollments, and academic results through a centralized web application.

The system provides separate access for **Administrators** and **Students** using JWT-based authentication and role-based authorization.

---

## 🚀 Features

### 👨‍💼 Admin Features

- Secure admin login
- Dashboard with statistics
- Add, view, update, and delete students
- Add, view, update, and delete courses
- Enroll students into courses
- Add, update, and delete student results
- Search and filter students and courses
- Manage student accounts
- Role-based access control
- Password hashing using `bcryptjs`

### 👨‍🎓 Student Features

- Secure student login
- Student dashboard
- View enrolled courses
- View personal academic results
- View student-specific information
- Administrative operations restricted to administrators
- Logout functionality

---

## 🛠️ Tech Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript

### Backend

- Node.js
- Express.js
- REST APIs

### Database

- Supabase PostgreSQL
- `pg`

### Authentication and Security

- JSON Web Tokens (JWT)
- `bcryptjs`
- Role-Based Access Control (RBAC)

### Development Tools

- Git and GitHub
- VS Code
- npm

---

# 📸 Screenshots

The screenshots below show the main EduManage user flow. Additional screens can be added to the `screenshots/` folder using the same numbered naming convention.

### 1. Login

![EduManage login screen](screenshots/01-login.png)

### 2. Dashboard

![EduManage dashboard](screenshots/02-dashboard.png)

### 3. Course Management

![Course management](screenshots/03-courses.png)

### 4. Student Management

![Student management](screenshots/04-students.png)

### 5. Enrollment Management

![Enrollment management](screenshots/05-enrollments.png)

### 6. View Results

![View results](screenshots/06-view-results.png)

---

# 🏗️ System Architecture

```text
                         ┌───────────────────────┐
                         │       User            │
                         │  Admin / Student      │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │      Frontend         │
                         │ HTML + CSS + JavaScript│
                         └───────────┬───────────┘
                                     │
                              HTTP / REST API
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │       Backend         │
                         │  Node.js + Express.js │
                         └───────────┬───────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
          ┌───────────────────┐             ┌───────────────────┐
          │ Authentication    │             │ Authorization     │
          │ JWT + bcryptjs    │             │ Admin / Student   │
          └───────────────────┘             └───────────────────┘
                    │                                 │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │   Supabase PostgreSQL  │
                         │       Database        │
                         └───────────┬───────────┘
                                     │
             ┌───────────────────────┼────────────────────────┐
             │                       │                        │
             ▼                       ▼                        ▼
       ┌───────────┐           ┌───────────┐            ┌───────────┐
       │ Students  │           │  Courses  │            │ Results   │
       └───────────┘           └───────────┘            └───────────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │ Enrollments │
                              └─────────────┘
```

---

# 🔐 Authentication Flow

```text
User
  │
  ▼
Login Page
  │
  │ Email + Password
  ▼
POST /api/auth/login
  │
  ▼
Backend
  ├── Find user
  ├── Compare password using bcryptjs
  └── Generate JWT
          │
          ▼
       Frontend
          │
          └── Store JWT
                  │
                  ▼
          Protected API Requests
                  │
                  ▼
             JWT Validation
                  │
                  ▼
           Role Verification
             /           \
            /             \
        Admin           Student
          │                 │
          ▼                 ▼
    Full Access        View-Only Access
```

---

# 🗄️ Database Architecture

EduManage uses Supabase PostgreSQL with relational tables for users, students, courses, enrollments, and results.

```text
┌─────────────────────┐
│      students       │
├─────────────────────┤
│ id (PK)             │
│ student_id (UNIQUE) │
│ name                │
│ email (UNIQUE)      │
│ phone               │
└──────────┬──────────┘
           │
           ├──────────────────────┐
           │                      │
           ▼                      ▼
┌─────────────────────┐    ┌─────────────────────┐
│    enrollments      │    │       results       │
├─────────────────────┤    ├─────────────────────┤
│ id (PK)             │    │ id (PK)             │
│ student_id (FK)     │    │ student_id (FK)     │
│ course_id (FK)      │    │ course_id (FK)      │
└──────────┬──────────┘    │ marks               │
           │               │ grade               │
           ▼               └──────────┬──────────┘
┌─────────────────────┐              │
│       courses       │◄─────────────┘
├─────────────────────┤
│ id (PK)             │
│ course_id (UNIQUE)  │
│ name                │
│ duration            │
│ fee                 │
└─────────────────────┘

┌─────────────────────┐
│        users        │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ email (UNIQUE)      │
│ password            │
│ role                │
│ student_id (FK)     │
└─────────────────────┘
```

### Relationships

- One student can enroll in multiple courses.
- One course can have multiple students.
- A student can have results for multiple courses.
- A student account is linked to a student record.
- Admin accounts are not linked to a student record.
- Related records are removed according to the database relationships.

---

# 📂 Project Structure

```text
EduManage/
│
├── css/
│   └── style.css
│
├── js/
│   ├── script.js
│   └── login.js
│
├── server/
│   ├── database.js
│   ├── server.js
│   ├── createadmin.js
│   └── createstudent.js
│
├── index.html
├── login.html
├── test-api.html
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

---

# 🔄 Application Workflow

## Admin Workflow

```text
Admin Login
     │
     ▼
Admin Dashboard
     │
     ├── Student Management
     │      ├── Add Student
     │      ├── Edit Student
     │      └── Delete Student
     │
     ├── Course Management
     │      ├── Add Course
     │      ├── Edit Course
     │      └── Delete Course
     │
     ├── Enrollment
     │      └── Enroll Student
     │
     └── Result Management
            ├── Add Result
            ├── Edit Result
            └── Delete Result
```

## Student Workflow

```text
Student Login
      │
      ▼
Student Dashboard
      │
      ├── My Courses
      ├── My Results
      └── Profile / Information
```

---

# 🔌 REST API

## Authentication

```text
POST /api/auth/login
```

## Students

```text
GET    /api/students
POST   /api/students
GET    /api/students/:id
PUT    /api/students/:id
DELETE /api/students/:id
```

## Courses

```text
GET    /api/courses
POST   /api/courses
GET    /api/courses/:id
PUT    /api/courses/:id
DELETE /api/courses/:id
```

## Enrollments

```text
GET  /api/enrollments
POST /api/enrollments
```

## Results

```text
GET    /api/results
POST   /api/results
PUT    /api/results/:id
DELETE /api/results/:id
```

## Student-Specific APIs

```text
GET /api/my-courses
GET /api/my-results
```

These endpoints return only the authenticated student's own academic information.

---

# 🔒 Security

### Password Hashing

Passwords are hashed using `bcryptjs` before being stored in the database. Passwords should never be stored as plain text.

### JWT Authentication

Protected API requests require:

```text
Authorization: Bearer <JWT_TOKEN>
```

### Role-Based Authorization

The application supports two roles:

```text
admin
student
```

Administrative operations are protected at the backend level rather than relying only on hidden frontend buttons.

> Before production deployment, move the JWT secret from `server/server.js` into a secure environment variable. Never commit real credentials or database files.

---

# ⚙️ Installation and Setup

## 1. Clone the repository

```bash
git clone https://github.com/Vishnuteja16/EduManage.git
```

## 2. Navigate to the project

```bash
cd EduManage
```

## 3. Install dependencies

```bash
npm install
```

## 4. Configure environment variables

Set these variables in your hosting provider or local environment:

```text
DATABASE_URL=<Supabase PostgreSQL connection string>
JWT_SECRET=<long random secret>
ADMIN_EMAIL=admin@edumanage.com
ADMIN_PASSWORD=<strong admin password>
```

Do not commit these values to GitHub.

## 5. Start the backend

```bash
npm start
```

The server runs at:

```text
http://localhost:5000
```

## 6. Open the application

Open `login.html` in a browser after starting the backend.

The server creates the required tables automatically in Supabase on startup.

Configure `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` environment variables in the hosting provider. `DATABASE_URL` is the Supabase PostgreSQL connection string.

---

# 🧪 Testing

Use `test-api.html` to manually check API behavior while the server is running.

The project currently does not include an automated test suite.

---

# 🌐 Deployment

The project can be deployed using Vercel for the frontend, with the Express backend hosted on Railway, Render, or another Node.js host connected to Supabase:

```text
Frontend → Vercel or another static host
Backend  → Railway, Render, Azure, or another Node.js host
Database → Supabase PostgreSQL
```

Production architecture:

```text
                User
                  │
                  ▼
             Static Host
              Frontend
                  │
                  │ HTTPS / REST API
                  ▼
              Node Host
          Node + Express API
                  │
                  ▼
        Persistent Database Storage
```

> Keep the Supabase connection string and application secrets in the hosting provider's environment settings, never in the repository.

---

# 🎯 Future Improvements

- PostgreSQL database migration
- Password change functionality
- Email notifications
- Attendance management
- Fee and payment management
- Admin and student profile editing
- Advanced analytics and pagination
- Automated tests
- Docker support
- Environment-based configuration

---

# 💡 Learning Outcomes

This project demonstrates:

- Frontend development with HTML, CSS, and JavaScript
- REST API development with Node.js and Express.js
- CRUD operations
- SQL and relational database design
- JWT authentication and password hashing
- Role-Based Access Control
- API integration and database relationships
- Git and GitHub workflow
- Full-stack application architecture

---

# 👨‍💻 Author

**Yanamala Sai Vishnu Teja**

B.Tech - Computer Science and Engineering
Mohan Babu University

---

## ⭐ Project Highlights

```text
Frontend
   ↓
REST API
   ↓
Authentication
   ↓
Authorization
   ↓
Business Logic
   ↓
Relational Database
```

EduManage demonstrates a practical education management platform with secure authentication, role-based access, and database-driven CRUD operations.

---

## 📜 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.