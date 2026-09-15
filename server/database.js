const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// ======================================================
// DATABASE FILE
// ======================================================

const dbPath = path.join(__dirname, "edumanage.db");


// ======================================================
// DATABASE CONNECTION
// ======================================================

const db = new sqlite3.Database(dbPath, (err) => {

    if (err) {

        console.log(
            "Database connection failed:",
            err.message
        );

    } else {

        console.log(
            "Connected to SQLite database"
        );

    }

});


// ======================================================
// ENABLE FOREIGN KEYS
// ======================================================

db.run("PRAGMA foreign_keys = ON");


// ======================================================
// CREATE TABLES
// ======================================================

db.serialize(() => {

    // ==================================================
    // STUDENTS
    // ==================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS students (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            student_id TEXT UNIQUE NOT NULL,

            name TEXT NOT NULL,

            email TEXT UNIQUE NOT NULL,

            phone TEXT

        )
    `);


    // ==================================================
    // COURSES
    // ==================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS courses (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            course_id TEXT UNIQUE NOT NULL,

            name TEXT NOT NULL,

            duration TEXT,

            fee REAL

        )
    `);


    // ==================================================
    // ENROLLMENTS
    // ==================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS enrollments (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            student_id INTEGER NOT NULL,

            course_id INTEGER NOT NULL,

            enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (student_id)
                REFERENCES students(id)
                ON DELETE CASCADE,

            FOREIGN KEY (course_id)
                REFERENCES courses(id)
                ON DELETE CASCADE,

            UNIQUE(student_id, course_id)

        )
    `);


    // ==================================================
    // RESULTS
    // ==================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS results (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            student_id INTEGER NOT NULL,

            course_id INTEGER NOT NULL,

            marks INTEGER NOT NULL,

            grade TEXT NOT NULL,

            FOREIGN KEY (student_id)
                REFERENCES students(id)
                ON DELETE CASCADE,

            FOREIGN KEY (course_id)
                REFERENCES courses(id)
                ON DELETE CASCADE,

            UNIQUE(student_id, course_id)

        )
    `);


    // ==================================================
    // USERS
    // ==================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS users (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT NOT NULL,

            email TEXT UNIQUE NOT NULL,

            password TEXT NOT NULL,

            role TEXT NOT NULL
                CHECK(role IN ('admin', 'student')),

            student_id INTEGER,

            FOREIGN KEY (student_id)
                REFERENCES students(id)
                ON DELETE CASCADE

        )
    `);


    console.log(
        "Database tables created successfully"
    );

});


// ======================================================
// EXPORT DATABASE
// ======================================================

module.exports = db;