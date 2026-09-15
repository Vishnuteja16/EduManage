# EduManage

EduManage is a web-based education management system for managing courses, students, and examination results from a responsive dashboard.

## Features

- Admin login with password hashing and JWT authentication
- Dashboard with course, student, and result summaries
- Course management: create, update, delete, and list courses
- Student management: create, update, delete, and list students
- Result management and student result search
- Responsive HTML, CSS, and JavaScript interface
- SQLite persistence through an Express API

## Technology

- Frontend: HTML5, CSS3, and vanilla JavaScript
- Backend: Node.js and Express
- Database: SQLite via `sqlite3`
- Authentication: `bcryptjs` and `jsonwebtoken`

## Project Structure

```text
EduManage/
|- index.html              # Main dashboard
|- login.html              # Login page
|- test-api.html           # API testing page
|- css/style.css           # Application styles
|- js/script.js            # Dashboard behavior and API calls
|- js/login.js             # Login behavior
|- server/server.js        # Express API server
|- server/database.js      # SQLite connection and table creation
|- server/createadmin.js   # Admin creation utility
|- server/createstudent.js # Student creation utility
|- package.json            # Node.js dependencies and scripts
`- package-lock.json
```

## Getting Started

### Requirements

- Node.js 18 or newer
- npm

### Install dependencies

```bash
npm install
```

### Start the API server

```bash
node server/server.js
```

The server runs at `http://localhost:5000`.

Open `login.html` in a browser to access the application. The server creates `server/edumanage.db` automatically on first start.

## Database and Security

The SQLite database is generated locally and is intentionally excluded from Git using `.gitignore`. Do not commit database files or credentials containing real student information. Configure production secrets through environment variables before deployment.

## Development Notes

The project currently has no automated test suite. Use `test-api.html` to manually check API behavior while the server is running.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
