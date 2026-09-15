# EduManage - Education Management System

EduManage is a full-stack Education Management System for managing students, courses, enrollments, and academic results through a centralized web application.

The system provides separate access for administrators and students using JWT-based authentication and role-based authorization.

## Features

### Admin Features

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

### Student Features

- Secure student login
- Student dashboard
- View enrolled courses
- View personal academic results
- View student-specific information
- Administrative operations are restricted to administrators
- Logout functionality

## Tech Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript

### Backend

- Node.js
- Express.js
- REST APIs

### Database

- SQLite
- `sqlite3`

### Authentication and Security

- JSON Web Tokens (JWT)
- `bcryptjs`
- Role-based access control (RBAC)

### Development Tools

- Git and GitHub
- VS Code
- npm

## System Architecture

```text
User (Admin or Student)
	    |
	    v
Frontend: HTML + CSS + JavaScript
	    |
	    | HTTP / REST API
	    v
Backend: Node.js + Express.js
	    |
	    +--> Authentication: JWT + bcryptjs
	    |
	    +--> Authorization: Admin / Student roles
	    |
	    v
Database: SQLite
	    |
	    +--> Students
	    +--> Courses
	    +--> Enrollments
	    `--> Results
```

## Authentication Flow

```text
Login page
    |
    | Email + password
    v
POST /api/auth/login
    |
    +--> Find user
    +--> Compare password with bcryptjs
    `--> Generate JWT
		 |
		 v
	 Frontend stores token
		 |
		 v
	 Protected API requests
		 |
		 v
	 JWT validation and role verification
```

Administrators receive access to management operations. Students can access only their own academic information.

## Database Architecture

EduManage uses SQLite with relational tables for users, students, courses, enrollments, and results.

```text
users
  |-- id, name, email, password, role
  `-- student_id (for student accounts)

students
  |-- id, student_id, name, email, phone
  |--< enrollments >-- courses
  `--< results >------ courses
```

### Relationships

- One student can enroll in multiple courses.
- One course can have multiple students.
- A student can have results for multiple courses.
- A student account is linked to a student record.
- Admin accounts are not linked to a student record.
- Related enrollments and results are removed when their parent record is deleted according to the database relationships.

## Project Structure

```text
EduManage/
|- css/
|  `- style.css
|- js/
|  |- script.js
|  `- login.js
|- server/
|  |- database.js
|  |- server.js
|  |- createadmin.js
|  `- createstudent.js
|- index.html
|- login.html
|- test-api.html
|- package.json
|- package-lock.json
|- .gitignore
`- README.md
```

## Application Workflow

### Admin Workflow

```text
Admin Login
     |
     v
Admin Dashboard
     |
     +--> Student Management: add, edit, delete
     +--> Course Management: add, edit, delete
     +--> Enrollment: enroll students into courses
     `--> Result Management: add, edit, delete
```

### Student Workflow

```text
Student Login
	|
	v
Student Dashboard
	|
	+--> My Courses
	+--> My Results
	`--> Profile and information
```

## REST API

### Authentication

```text
POST /api/auth/login
```

### Students

```text
GET    /api/students
POST   /api/students
GET    /api/students/:id
PUT    /api/students/:id
DELETE /api/students/:id
```

### Courses

```text
GET    /api/courses
POST   /api/courses
GET    /api/courses/:id
PUT    /api/courses/:id
DELETE /api/courses/:id
```

### Enrollments

```text
GET  /api/enrollments
POST /api/enrollments
```

### Results

```text
GET    /api/results
POST   /api/results
PUT    /api/results/:id
DELETE /api/results/:id
```

### Student-specific APIs

```text
GET /api/my-courses
GET /api/my-results
```

These endpoints return the authenticated student's own academic information.

## Security

### Password Hashing

Passwords are hashed with `bcryptjs` before they are stored. Passwords should never be stored as plain text.

### JWT Authentication

Protected requests use the following header:

```text
Authorization: Bearer <JWT_TOKEN>
```

### Role-Based Authorization

The application supports two roles:

```text
admin
student
```

Administrative operations are protected by backend authorization rather than only hiding frontend controls.

> Before production deployment, move the JWT secret from `server/server.js` into a secure environment variable and use a strong secret. Never commit real credentials or database files.

## Installation and Setup

### Requirements

- Node.js 18 or newer
- npm

### 1. Clone the repository

```bash
git clone https://github.com/Vishnuteja16/EduManage.git
```

### 2. Navigate to the project

```bash
cd EduManage
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the backend

```bash
node server/server.js
```

The API server runs at `http://localhost:5000`.

### 5. Open the application

Open `login.html` in a browser after starting the backend.

The server creates `server/edumanage.db` automatically. The database file is local runtime data and is excluded from Git.

## Testing

Use `test-api.html` to manually check API behavior while the server is running. The project does not currently include an automated test suite.

## Deployment

The frontend and backend can be deployed separately:

```text
Frontend -> Vercel or another static host
Backend  -> Render, Azure, or another Node.js host
Database -> SQLite for demonstrations, PostgreSQL for production
```

SQLite on an ephemeral cloud filesystem is suitable for demonstrations and testing, but a production deployment should use persistent storage or migrate to PostgreSQL.

## Future Improvements

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

## Learning Outcomes

This project demonstrates:

- Frontend development with HTML, CSS, and JavaScript
- REST API development with Node.js and Express.js
- CRUD operations
- SQL and relational database design
- JWT authentication and password hashing
- Role-based access control
- API integration and database relationships
- Git and GitHub workflow

## Author

**Yanamala Sai Vishnu Teja**

B.Tech - Computer Science and Engineering
Mohan Babu University

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
