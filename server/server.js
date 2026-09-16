require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const db = require("./database");

const app = express();


// ======================================================
// CONFIGURATION
// ======================================================

const PORT = process.env.PORT || 5000;

const JWT_SECRET =
    process.env.JWT_SECRET || "edumanage_secret_key_2026";

const DEFAULT_STUDENT_PASSWORD = "student123";

const ADMIN_EMAIL =
    process.env.ADMIN_EMAIL || "admin@edumanage.com";

const ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD || "admin123";


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());

app.use(express.json());

app.use(express.static(path.join(__dirname, "..")));


// ======================================================
// BASIC ROUTE
// ======================================================

app.get("/", (req, res) => {

    res.sendFile(path.join(__dirname, "..", "index.html"));

});


// ======================================================
// AUTHENTICATION MIDDLEWARE
// ======================================================

function authenticateToken(req, res, next) {

    const authHeader = req.headers["authorization"];

    if (!authHeader) {

        return res.status(401).json({
            error: "Access token required"
        });

    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {

        return res.status(401).json({
            error: "Invalid authorization format"
        });

    }

    const token = parts[1];

    jwt.verify(
        token,
        JWT_SECRET,
        (err, user) => {

            if (err) {

                return res.status(403).json({
                    error: "Invalid or expired token"
                });

            }

            req.user = user;

            next();

        }
    );

}


// ======================================================
// ADMIN AUTHORIZATION
// ======================================================

function requireAdmin(req, res, next) {

    if (!req.user || req.user.role !== "admin") {

        return res.status(403).json({
            error: "Admin access required"
        });

    }

    next();

}

function isDuplicateKeyError(error) {

    return error?.code === 11000 ||
        error?.message?.includes("UNIQUE constraint failed");
}


// ======================================================
// LOGIN
// ======================================================

app.post(
    "/api/auth/login",
    async (req, res) => {

        const email =
            req.body.email
                ?.trim()
                .toLowerCase();

        const password =
            req.body.password
                ?.trim();

        if (!email || !password) {

            return res.status(400).json({
                error: "Email and password are required"
            });

        }

        const sql = `
            SELECT
                id,
                name,
                email,
                password,
                role,
                student_id
            FROM users
            WHERE email = ?
        `;

        db.get(
            sql,
            [email],
            async (err, user) => {

                if (err) {

                    console.log(
                        "Login database error:",
                        err.message
                    );

                    return res.status(500).json({
                        error: "Login failed"
                    });

                }

                if (!user) {

                    return res.status(401).json({
                        error: "Invalid email or password"
                    });

                }

                try {

                    const passwordMatch =
                        await bcrypt.compare(
                            password,
                            user.password
                        );

                    if (!passwordMatch) {

                        return res.status(401).json({
                            error: "Invalid email or password"
                        });

                    }

                    const token =
                        jwt.sign(
                            {
                                id: user.id,
                                email: user.email,
                                role: user.role,
                                student_id: user.student_id
                            },
                            JWT_SECRET,
                            {
                                expiresIn: "2h"
                            }
                        );

                    return res.json({

                        message: "Login successful",

                        token: token,

                        user: {

                            id: user.id,

                            name: user.name,

                            email: user.email,

                            role: user.role,

                            student_id: user.student_id

                        }

                    });

                } catch (error) {

                    console.log(
                        "Password verification error:",
                        error.message
                    );

                    return res.status(500).json({
                        error: "Login failed"
                    });

                }

            }
        );

    }
);


// ======================================================
// AUTOMATICALLY CREATE MISSING STUDENT LOGIN ACCOUNTS
// ======================================================

function createMissingStudentAccounts() {

    db.all(
        `
        SELECT
            s.id,
            s.student_id,
            s.name,
            s.email
        FROM students s
        LEFT JOIN users u
            ON u.student_id = s.id
        WHERE u.id IS NULL
        `,
        [],
        async (err, students) => {

            if (err) {

                console.log(
                    "Failed to check missing student accounts:",
                    err.message
                );

                return;

            }

            if (students.length === 0) {

                console.log(
                    "All students already have login accounts."
                );

                return;

            }

            console.log(
                `Found ${students.length} student(s) without login accounts.`
            );

            try {

                const hashedPassword =
                    await bcrypt.hash(
                        DEFAULT_STUDENT_PASSWORD,
                        10
                    );

                for (const student of students) {

                    try {

                        const cleanEmail =
                            student.email
                                .trim()
                                .toLowerCase();

                        const existingUser =
                            await new Promise(
                                (resolve, reject) => {

                                    db.get(
                                        `
                                        SELECT id
                                        FROM users
                                        WHERE email = ?
                                        `,
                                        [cleanEmail],
                                        (err, row) => {

                                            if (err) {
                                                reject(err);
                                            } else {
                                                resolve(row);
                                            }

                                        }
                                    );

                                }
                            );

                        if (existingUser) {

                            console.log(
                                `Cannot create login for ${student.name}: email already belongs to another user.`
                            );

                            continue;

                        }

                        await new Promise(
                            (resolve, reject) => {

                                db.run(
                                    `
                                    INSERT INTO users
                                    (
                                        name,
                                        email,
                                        password,
                                        role,
                                        student_id
                                    )
                                    VALUES (?, ?, ?, 'student', ?)
                                    `,
                                    [
                                        student.name,
                                        cleanEmail,
                                        hashedPassword,
                                        student.id
                                    ],
                                    function(err) {

                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve();
                                        }

                                    }
                                );

                            }
                        );

                        console.log(
                            `Student login account created for: ${student.name}`
                        );

                        console.log(
                            `Email: ${cleanEmail}`
                        );

                        console.log(
                            `Default Password: ${DEFAULT_STUDENT_PASSWORD}`
                        );

                    } catch (accountError) {

                        console.log(
                            `Failed to create account for ${student.name}:`,
                            accountError.message
                        );

                    }

                }

                console.log(
                    "Student account synchronization completed."
                );

            } catch (error) {

                console.log(
                    "Student account synchronization error:",
                    error.message
                );

            }

        }
    );

}

function createAdminAccount() {

    db.get(
        `SELECT id, password FROM users WHERE email = ?`,
        [ADMIN_EMAIL],
        async (err, user) => {

            if (err) {
                console.log("Failed to check admin account:", err.message);
                return;
            }

            if (user) {

                try {

                    const passwordMatches =
                        await bcrypt.compare(
                            ADMIN_PASSWORD,
                            user.password
                        );

                    if (!passwordMatches) {

                        const hashedPassword =
                            await bcrypt.hash(
                                ADMIN_PASSWORD,
                                10
                            );

                        db.run(
                            `
                            UPDATE users
                            SET password = ?
                            WHERE id = ?
                            `,
                            [hashedPassword, user.id],
                            (updateError) => {
                                if (updateError) {
                                    console.log(
                                        "Failed to update admin password:",
                                        updateError.message
                                    );
                                } else {
                                    console.log(
                                        `Admin password synchronized for ${ADMIN_EMAIL}`
                                    );
                                }
                            }
                        );
                    }

                } catch (passwordError) {

                    console.log(
                        "Failed to verify admin password:",
                        passwordError.message
                    );
                }

                return;
            }

            try {
                const hashedPassword =
                    await bcrypt.hash(ADMIN_PASSWORD, 10);

                db.run(
                    `
                    INSERT INTO users (name, email, password, role)
                    VALUES (?, ?, ?, 'admin')
                    `,
                    ["EduManage Admin", ADMIN_EMAIL, hashedPassword],
                    (insertError) => {
                        if (insertError) {
                            console.log(
                                "Failed to create admin account:",
                                insertError.message
                            );
                            return;
                        }

                        console.log(
                            `Admin account created for ${ADMIN_EMAIL}`
                        );
                    }
                );
            } catch (hashError) {
                console.log(
                    "Failed to hash admin password:",
                    hashError.message
                );
            }

        }
    );

}


// ======================================================
// STUDENT APIs
// ======================================================


// ======================================================
// ADD STUDENT
// ======================================================

app.post(
    "/api/students",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        const {
            student_id,
            name,
            email,
            phone
        } = req.body;

        if (
            !student_id ||
            !name ||
            !email
        ) {

            return res.status(400).json({
                error:
                    "Student ID, name and email are required"
            });

        }

        const cleanStudentId =
            String(student_id).trim();

        const cleanName =
            String(name).trim();

        const cleanEmail =
            String(email).trim().toLowerCase();

        const cleanPhone =
            phone
                ? String(phone).trim()
                : null;

        try {

            // ------------------------------------------
            // Check duplicate student
            // ------------------------------------------

            const existingStudent =
                await new Promise((resolve, reject) => {

                    db.get(
                        `
                        SELECT id
                        FROM students
                        WHERE student_id = ?
                           OR email = ?
                        `,
                        [
                            cleanStudentId,
                            cleanEmail
                        ],
                        (err, row) => {

                            if (err) {
                                reject(err);
                            } else {
                                resolve(row);
                            }

                        }
                    );

                });

            if (existingStudent) {

                return res.status(409).json({
                    error:
                        "Student ID or email already exists"
                });

            }


            // ------------------------------------------
            // Check duplicate user email
            // ------------------------------------------

            const existingUser =
                await new Promise((resolve, reject) => {

                    db.get(
                        `
                        SELECT id
                        FROM users
                        WHERE email = ?
                        `,
                        [cleanEmail],
                        (err, row) => {

                            if (err) {
                                reject(err);
                            } else {
                                resolve(row);
                            }

                        }
                    );

                });

            if (existingUser) {

                return res.status(409).json({
                    error:
                        "A login account already exists with this email"
                });

            }


            // ------------------------------------------
            // Hash default password
            // ------------------------------------------

            const hashedPassword =
                await bcrypt.hash(
                    DEFAULT_STUDENT_PASSWORD,
                    10
                );


            // ------------------------------------------
            // Insert student
            // ------------------------------------------

            const studentDbId =
                await new Promise((resolve, reject) => {

                    db.run(
                        `
                        INSERT INTO students
                        (
                            student_id,
                            name,
                            email,
                            phone
                        )
                        VALUES (?, ?, ?, ?)
                        `,
                        [
                            cleanStudentId,
                            cleanName,
                            cleanEmail,
                            cleanPhone
                        ],
                        function(err) {

                            if (err) {
                                reject(err);
                            } else {
                                resolve(this.lastID);
                            }

                        }
                    );

                });


            // ------------------------------------------
            // Create login account
            // ------------------------------------------

            try {

                await new Promise((resolve, reject) => {

                    db.run(
                        `
                        INSERT INTO users
                        (
                            name,
                            email,
                            password,
                            role,
                            student_id
                        )
                        VALUES (?, ?, ?, 'student', ?)
                        `,
                        [
                            cleanName,
                            cleanEmail,
                            hashedPassword,
                            studentDbId
                        ],
                        function(err) {

                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }

                        }
                    );

                });

            } catch (userError) {

                await new Promise((resolve) => {

                    db.run(
                        `
                        DELETE FROM students
                        WHERE id = ?
                        `,
                        [studentDbId],
                        () => resolve()
                    );

                });

                throw userError;

            }


            // ------------------------------------------
            // Success
            // ------------------------------------------

            return res.status(201).json({

                message:
                    "Student and login account created successfully",

                id: studentDbId,

                login: {

                    email: cleanEmail,

                    defaultPassword:
                        DEFAULT_STUDENT_PASSWORD,

                    role: "student"

                }

            });

        } catch (error) {

            console.log(
                "Add student error:",
                error.message
            );

            return res.status(500).json({
                error:
                    isDuplicateKeyError(error)
                        ? "Student ID or email already exists"
                        : "Failed to create student and login account"
            });

        }

    }
);


// ======================================================
// GET ALL STUDENTS
// ======================================================

app.get(
    "/api/students",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const sql = `
            SELECT
                id,
                student_id,
                name,
                email,
                phone
            FROM students
            ORDER BY id DESC
        `;

        db.all(
            sql,
            [],
            (err, rows) => {

                if (err) {

                    console.log(
                        "Get students error:",
                        err.message
                    );

                    return res.status(500).json({
                        error:
                            "Failed to fetch students"
                    });

                }

                return res.json(rows);

            }
        );

    }
);


// ======================================================
// UPDATE STUDENT
// ======================================================

app.put(
    "/api/students/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const id =
            req.params.id;

        const {
            student_id,
            name,
            email,
            phone
        } = req.body;

        if (
            !student_id ||
            !name ||
            !email
        ) {

            return res.status(400).json({
                error:
                    "Student ID, name and email are required"
            });

        }

        const cleanStudentId =
            String(student_id).trim();

        const cleanName =
            String(name).trim();

        const cleanEmail =
            String(email).trim().toLowerCase();

        const cleanPhone =
            phone
                ? String(phone).trim()
                : null;


        // ------------------------------------------
        // Check duplicate student
        // ------------------------------------------

        db.get(
            `
            SELECT id
            FROM students
            WHERE
                (student_id = ? OR email = ?)
                AND id != ?
            `,
            [
                cleanStudentId,
                cleanEmail,
                id
            ],
            (checkErr, existingStudent) => {

                if (checkErr) {

                    console.log(
                        "Student duplicate check error:",
                        checkErr.message
                    );

                    return res.status(500).json({
                        error:
                            "Failed to update student"
                    });

                }

                if (existingStudent) {

                    return res.status(409).json({
                        error:
                            "Student ID or email already exists"
                    });

                }


                // ------------------------------------------
                // Check duplicate user email
                // ------------------------------------------

                db.get(
                    `
                    SELECT id
                    FROM users
                    WHERE
                        email = ?
                        AND NOT (
                            role = 'student'
                            AND student_id = ?
                        )
                    `,
                    [
                        cleanEmail,
                        id
                    ],
                    (userCheckErr, existingUser) => {

                        if (userCheckErr) {

                            console.log(
                                "User email check error:",
                                userCheckErr.message
                            );

                            return res.status(500).json({
                                error:
                                    "Failed to update student"
                            });

                        }

                        if (existingUser) {

                            return res.status(409).json({
                                error:
                                    "This email already belongs to another login account"
                            });

                        }


                        // ------------------------------------------
                        // Update student
                        // ------------------------------------------

                        const sql = `
                            UPDATE students
                            SET
                                student_id = ?,
                                name = ?,
                                email = ?,
                                phone = ?
                            WHERE id = ?
                        `;

                        db.run(
                            sql,
                            [
                                cleanStudentId,
                                cleanName,
                                cleanEmail,
                                cleanPhone,
                                id
                            ],
                            function(err) {

                                if (err) {

                                    console.log(
                                        "Update student error:",
                                        err.message
                                    );

                                    return res.status(500).json({
                                        error:
                                            "Failed to update student"
                                    });

                                }

                                if (this.changes === 0) {

                                    return res.status(404).json({
                                        error:
                                            "Student not found"
                                    });

                                }


                                // ------------------------------------------
                                // Synchronize login account
                                // ------------------------------------------

                                db.run(
                                    `
                                    UPDATE users
                                    SET
                                        name = ?,
                                        email = ?
                                    WHERE
                                        student_id = ?
                                        AND role = 'student'
                                    `,
                                    [
                                        cleanName,
                                        cleanEmail,
                                        id
                                    ],
                                    (userErr) => {

                                        if (userErr) {

                                            console.log(
                                                "Student login update warning:",
                                                userErr.message
                                            );

                                        }

                                        return res.json({

                                            message:
                                                "Student updated successfully"

                                        });

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

    }
);


// ======================================================
// DELETE STUDENT
// ======================================================

app.delete(
    "/api/students/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const id = req.params.id;

        console.log(
            `Deleting student with database ID: ${id}`
        );


        // ------------------------------------------
        // DELETE RESULTS FIRST
        // ------------------------------------------

        db.run(
            `
            DELETE FROM results
            WHERE student_id = ?
            `,
            [id],
            function(resultErr) {

                if (resultErr) {

                    console.log(
                        "Delete student results error:",
                        resultErr.message
                    );

                    return res.status(500).json({
                        error:
                            "Failed to delete student's results"
                    });

                }

                console.log(
                    `Deleted ${this.changes} result(s)`
                );


                // ------------------------------------------
                // DELETE ENROLLMENTS
                // ------------------------------------------

                db.run(
                    `
                    DELETE FROM enrollments
                    WHERE student_id = ?
                    `,
                    [id],
                    function(enrollmentErr) {

                        if (enrollmentErr) {

                            console.log(
                                "Delete student enrollments error:",
                                enrollmentErr.message
                            );

                            return res.status(500).json({
                                error:
                                    "Failed to delete student's enrollments"
                            });

                        }

                        console.log(
                            `Deleted ${this.changes} enrollment(s)`
                        );


                        // ------------------------------------------
                        // DELETE STUDENT LOGIN ACCOUNT
                        // ------------------------------------------

                        db.run(
                            `
                            DELETE FROM users
                            WHERE student_id = ?
                            AND role = 'student'
                            `,
                            [id],
                            function(userErr) {

                                if (userErr) {

                                    console.log(
                                        "Delete student login error:",
                                        userErr.message
                                    );

                                    return res.status(500).json({
                                        error:
                                            "Failed to delete student's login account"
                                    });

                                }

                                console.log(
                                    `Deleted ${this.changes} student login account(s)`
                                );


                                // ------------------------------------------
                                // DELETE STUDENT
                                // ------------------------------------------

                                db.run(
                                    `
                                    DELETE FROM students
                                    WHERE id = ?
                                    `,
                                    [id],
                                    function(studentErr) {

                                        if (studentErr) {

                                            console.log(
                                                "Delete student error:",
                                                studentErr.message
                                            );

                                            return res.status(500).json({
                                                error:
                                                    "Failed to delete student"
                                            });

                                        }

                                        if (this.changes === 0) {

                                            return res.status(404).json({
                                                error:
                                                    "Student not found"
                                            });

                                        }

                                        console.log(
                                            `Student ${id} deleted successfully`
                                        );

                                        return res.json({

                                            message:
                                                "Student and all linked data deleted successfully"

                                        });

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

    }
);


// ======================================================
// COURSE APIs
// ======================================================


// ======================================================
// ADD COURSE
// ======================================================

app.post(
    "/api/courses",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const {
            course_id,
            name,
            duration,
            fee
        } = req.body;

        if (
            !course_id ||
            !name
        ) {

            return res.status(400).json({
                error:
                    "Course ID and course name are required"
            });

        }

        const cleanCourseId =
            String(course_id).trim();

        const cleanName =
            String(name).trim();

        const cleanDuration =
            duration
                ? String(duration).trim()
                : null;

        const numericFee =
            fee === undefined ||
            fee === null ||
            fee === ""
                ? 0
                : Number(fee);

        if (isNaN(numericFee) || numericFee < 0) {

            return res.status(400).json({
                error:
                    "Course fee must be a valid non-negative number"
            });

        }

        db.run(
            `
            INSERT INTO courses
            (
                course_id,
                name,
                duration,
                fee
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                cleanCourseId,
                cleanName,
                cleanDuration,
                numericFee
            ],
            function(err) {

                if (err) {

                    console.log(
                        "Add course error:",
                        err.message
                    );

                    if (isDuplicateKeyError(err)) {

                        return res.status(409).json({
                            error:
                                "Course ID already exists"
                        });

                    }

                    return res.status(500).json({
                        error:
                            "Failed to add course"
                    });

                }

                return res.status(201).json({

                    message:
                        "Course added successfully",

                    id: this.lastID

                });

            }
        );

    }
);


// ======================================================
// GET COURSES
// ======================================================

app.get(
    "/api/courses",
    authenticateToken,
    (req, res) => {

        const sql = `
            SELECT
                id,
                course_id,
                name,
                duration,
                fee
            FROM courses
            ORDER BY id DESC
        `;

        db.all(
            sql,
            [],
            (err, rows) => {

                if (err) {

                    console.log(
                        "Get courses error:",
                        err.message
                    );

                    return res.status(500).json({
                        error:
                            "Failed to fetch courses"
                    });

                }

                return res.json(rows);

            }
        );

    }
);


// ======================================================
// UPDATE COURSE
// ======================================================

app.put(
    "/api/courses/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const id =
            req.params.id;

        const {
            course_id,
            name,
            duration,
            fee
        } = req.body;

        if (
            !course_id ||
            !name
        ) {

            return res.status(400).json({
                error:
                    "Course ID and course name are required"
            });

        }

        const cleanCourseId =
            String(course_id).trim();

        const cleanName =
            String(name).trim();

        const cleanDuration =
            duration
                ? String(duration).trim()
                : null;

        const numericFee =
            fee === undefined ||
            fee === null ||
            fee === ""
                ? 0
                : Number(fee);

        if (isNaN(numericFee) || numericFee < 0) {

            return res.status(400).json({
                error:
                    "Course fee must be a valid non-negative number"
            });

        }


        // ------------------------------------------
        // Check duplicate course ID
        // ------------------------------------------

        db.get(
            `
            SELECT id
            FROM courses
            WHERE
                course_id = ?
                AND id != ?
            `,
            [
                cleanCourseId,
                id
            ],
            (checkErr, existingCourse) => {

                if (checkErr) {

                    console.log(
                        "Course duplicate check error:",
                        checkErr.message
                    );

                    return res.status(500).json({
                        error:
                            "Failed to update course"
                    });

                }

                if (existingCourse) {

                    return res.status(409).json({
                        error:
                            "Course ID already exists"
                    });

                }


                // ------------------------------------------
                // UPDATE COURSE
                // ------------------------------------------

                db.run(
                    `
                    UPDATE courses
                    SET
                        course_id = ?,
                        name = ?,
                        duration = ?,
                        fee = ?
                    WHERE id = ?
                    `,
                    [
                        cleanCourseId,
                        cleanName,
                        cleanDuration,
                        numericFee,
                        id
                    ],
                    function(err) {

                        if (err) {

                            console.log(
                                "Update course error:",
                                err.message
                            );

                            return res.status(500).json({
                                error:
                                    "Failed to update course"
                            });

                        }

                        if (this.changes === 0) {

                            return res.status(404).json({
                                error:
                                    "Course not found"
                            });

                        }

                        return res.json({

                            message:
                                "Course updated successfully"

                        });

                    }
                );

            }
        );

    }
);


// ======================================================
// DELETE COURSE
// ======================================================

app.delete(
    "/api/courses/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const id = req.params.id;

        console.log(
            `Deleting course with database ID: ${id}`
        );


        // ------------------------------------------
        // DELETE RESULTS FIRST
        // ------------------------------------------

        db.run(
            `
            DELETE FROM results
            WHERE course_id = ?
            `,
            [id],
            function(resultErr) {

                if (resultErr) {

                    console.log(
                        "Delete course results error:",
                        resultErr.message
                    );

                    return res.status(500).json({
                        error:
                            "Failed to delete course results"
                    });

                }

                console.log(
                    `Deleted ${this.changes} result(s)`
                );


                // ------------------------------------------
                // DELETE ENROLLMENTS
                // ------------------------------------------

                db.run(
                    `
                    DELETE FROM enrollments
                    WHERE course_id = ?
                    `,
                    [id],
                    function(enrollmentErr) {

                        if (enrollmentErr) {

                            console.log(
                                "Delete course enrollments error:",
                                enrollmentErr.message
                            );

                            return res.status(500).json({
                                error:
                                    "Failed to delete course enrollments"
                            });

                        }

                        console.log(
                            `Deleted ${this.changes} enrollment(s)`
                        );


                        // ------------------------------------------
                        // DELETE COURSE
                        // ------------------------------------------

                        db.run(
                            `
                            DELETE FROM courses
                            WHERE id = ?
                            `,
                            [id],
                            function(courseErr) {

                                if (courseErr) {

                                    console.log(
                                        "Delete course error:",
                                        courseErr.message
                                    );

                                    return res.status(500).json({
                                        error:
                                            "Failed to delete course"
                                    });

                                }

                                if (this.changes === 0) {

                                    return res.status(404).json({
                                        error:
                                            "Course not found"
                                    });

                                }

                                console.log(
                                    `Course ${id} deleted successfully`
                                );

                                return res.json({

                                    message:
                                        "Course and all linked data deleted successfully"

                                });

                            }
                        );

                    }
                );

            }
        );

    }
);


// ======================================================
// ENROLLMENT APIs
// ======================================================


// ======================================================
// ENROLL STUDENT IN COURSE
// ======================================================

app.post(
    "/api/enrollments",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const {
            student_id,
            course_id
        } = req.body;

        if (
            !student_id ||
            !course_id
        ) {

            return res.status(400).json({
                error:
                    "Student and course are required"
            });

        }

        db.run(
            `
            INSERT INTO enrollments
            (
                student_id,
                course_id
            )
            VALUES (?, ?)
            `,
            [
                student_id,
                course_id
            ],
            function(err) {

                if (err) {

                    console.log(
                        "Enrollment error:",
                        err.message
                    );

                    if (
                        err.message.includes(
                            "UNIQUE constraint failed"
                        )
                    ) {

                        return res.status(409).json({
                            error:
                                "Student is already enrolled in this course"
                        });

                    }

                    if (
                        err.message.includes(
                            "FOREIGN KEY constraint failed"
                        )
                    ) {

                        return res.status(400).json({
                            error:
                                "Invalid student or course"
                        });

                    }

                    return res.status(500).json({
                        error:
                            "Failed to enroll student"
                    });

                }

                return res.status(201).json({

                    message:
                        "Student enrolled successfully",

                    id: this.lastID

                });

            }
        );

    }
);


// ======================================================
// GET ALL ENROLLMENTS
// ADMIN ONLY
// ======================================================

app.get(
    "/api/enrollments",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const sql = `
            SELECT

                e.id,

                s.id AS student_db_id,

                s.student_id,

                s.name AS student_name,

                c.id AS course_db_id,

                c.course_id,

                c.name AS course_name,

                c.duration,

                c.fee

            FROM enrollments e

            INNER JOIN students s
                ON e.student_id = s.id

            INNER JOIN courses c
                ON e.course_id = c.id

            ORDER BY e.id DESC
        `;

        db.all(
            sql,
            [],
            (err, rows) => {

                if (err) {

                    console.log(
                        "Get enrollments error:",
                        err.message
                    );

                    return res.status(500).json({
                        error:
                            "Failed to fetch enrollments"
                    });

                }

                return res.json(rows);

            }
        );

    }
);


// ======================================================
// DELETE ENROLLMENT
// ======================================================

app.delete(
    "/api/enrollments/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const id =
            req.params.id;

        db.run(
            `
            DELETE FROM enrollments
            WHERE id = ?
            `,
            [id],
            function(err) {

                if (err) {

                    console.log(
                        "Delete enrollment error:",
                        err.message
                    );

                    return res.status(500).json({
                        error:
                            "Failed to remove enrollment"
                    });

                }

                if (this.changes === 0) {

                    return res.status(404).json({
                        error:
                            "Enrollment not found"
                    });

                }

                return res.json({

                    message:
                        "Enrollment removed successfully"

                });

            }
        );

    }
);


// ======================================================
// STUDENT - MY COURSES
// ======================================================

app.get(
    "/api/my-courses",
    authenticateToken,
    (req, res) => {

        if (req.user.role !== "student") {

            return res.status(403).json({
                error:
                    "Student access required"
            });

        }

        if (!req.user.student_id) {

            return res.status(400).json({
                error:
                    "Student account is not linked to a student record"
            });

        }

        const sql = `
            SELECT

                c.id,

                c.course_id,

                c.name,

                c.duration,

                c.fee,

                e.id AS enrollment_id

            FROM enrollments e

            INNER JOIN courses c
                ON e.course_id = c.id

            WHERE e.student_id = ?

            ORDER BY c.name
        `;

        db.all(
            sql,
            [req.user.student_id],
            (err, rows) => {

                if (err) {

                    console.log(
                        "My courses error:",
                        err.message
                    );

                    return res.status(500).json({
                        error:
                            "Failed to fetch enrolled courses"
                    });

                }

                return res.json(rows);

            }
        );

    }
);


// ======================================================
// RESULT APIs
// ======================================================


// ======================================================
// CALCULATE GRADE
// ======================================================

function calculateGrade(marks) {

    if (marks >= 90) {

        return "A+";

    } else if (marks >= 80) {

        return "A";

    } else if (marks >= 70) {

        return "B";

    } else if (marks >= 60) {

        return "C";

    } else if (marks >= 50) {

        return "D";

    } else if (marks >= 40) {

        return "E";

    } else {

        return "F";

    }

}


// ======================================================
// ADD RESULT
// ======================================================

app.post(
    "/api/results",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const {
            student_id,
            course_id,
            marks
        } = req.body;

        if (
            !student_id ||
            !course_id ||
            marks === undefined ||
            marks === null ||
            marks === ""
        ) {

            return res.status(400).json({
                error:
                    "Student, course and marks are required"
            });

        }

        const numericMarks =
            Number(marks);

        if (
            isNaN(numericMarks) ||
            numericMarks < 0 ||
            numericMarks > 100
        ) {

            return res.status(400).json({
                error:
                    "Marks must be between 0 and 100"
            });

        }

        const grade =
            calculateGrade(numericMarks);

        db.run(
            `
            INSERT INTO results
            (
                student_id,
                course_id,
                marks,
                grade
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                student_id,
                course_id,
                numericMarks,
                grade
            ],
            function(err) {

                if (err) {

                    console.log(
                        "Add result error:",
                        err.message
                    );

                    if (
                        err.message.includes(
                            "UNIQUE constraint failed"
                        )
                    ) {

                        return res.status(409).json({
                            error:
                                "Result already exists for this student and course"
                        });

                    }

                    if (
                        err.message.includes(
                            "FOREIGN KEY constraint failed"
                        )
                    ) {

                        return res.status(400).json({
                            error:
                                "Invalid student or course"
                        });

                    }

                    return res.status(500).json({
                        error:
                            "Failed to add result"
                    });

                }

                return res.status(201).json({

                    message:
                        "Result added successfully",

                    id: this.lastID,

                    grade: grade

                });

            }
        );

    }
);


// ======================================================
// GET ALL RESULTS
// ======================================================

app.get(
    "/api/results",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const sql = `
            SELECT

                r.id,

                s.student_id,

                s.name AS student_name,

                c.course_id,

                c.name AS course_name,

                r.marks,

                r.grade

            FROM results r

            INNER JOIN students s
                ON r.student_id = s.id

            INNER JOIN courses c
                ON r.course_id = c.id

            ORDER BY r.id DESC
        `;

        db.all(
            sql,
            [],
            (err, rows) => {

                if (err) {

                    console.log(
                        "Get results error:",
                        err.message
                    );

                    return res.status(500).json({
                        error:
                            "Failed to fetch results"
                    });

                }

                return res.json(rows);

            }
        );

    }
);


// ======================================================
// STUDENT - MY RESULTS
// ======================================================

app.get(
    "/api/my-results",
    authenticateToken,
    (req, res) => {

        if (req.user.role !== "student") {

            return res.status(403).json({
                error:
                    "Student access required"
            });

        }

        if (!req.user.student_id) {

            return res.status(400).json({
                error:
                    "Student account is not linked to a student record"
            });

        }

        const sql = `
            SELECT

                r.id,

                s.student_id,

                s.name AS student_name,

                c.course_id,

                c.name AS course_name,

                r.marks,

                r.grade

            FROM results r

            INNER JOIN students s
                ON r.student_id = s.id

            INNER JOIN courses c
                ON r.course_id = c.id

            WHERE r.student_id = ?

            ORDER BY r.id DESC
        `;

        db.all(
            sql,
            [req.user.student_id],
            (err, rows) => {

                if (err) {

                    console.log(
                        "My results error:",
                        err.message
                    );

                    return res.status(500).json({
                        error:
                            "Failed to fetch your results"
                    });

                }

                return res.json(rows);

            }
        );

    }
);


// ======================================================
// UPDATE RESULT
// ======================================================

app.put(
    "/api/results/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const id =
            req.params.id;

        const {
            student_id,
            course_id,
            marks
        } = req.body;

        if (
            !student_id ||
            !course_id ||
            marks === undefined ||
            marks === null ||
            marks === ""
        ) {

            return res.status(400).json({
                error:
                    "Student, course and marks are required"
            });

        }

        const numericMarks =
            Number(marks);

        if (
            isNaN(numericMarks) ||
            numericMarks < 0 ||
            numericMarks > 100
        ) {

            return res.status(400).json({
                error:
                    "Marks must be between 0 and 100"
            });

        }

        const grade =
            calculateGrade(numericMarks);

        db.run(
            `
            UPDATE results
            SET
                student_id = ?,
                course_id = ?,
                marks = ?,
                grade = ?
            WHERE id = ?
            `,
            [
                student_id,
                course_id,
                numericMarks,
                grade,
                id
            ],
            function(err) {

                if (err) {

                    console.log(
                        "Update result error:",
                        err.message
                    );

                    if (
                        err.message.includes(
                            "UNIQUE constraint failed"
                        )
                    ) {

                        return res.status(409).json({
                            error:
                                "Result already exists for this student and course"
                        });

                    }

                    if (
                        err.message.includes(
                            "FOREIGN KEY constraint failed"
                        )
                    ) {

                        return res.status(400).json({
                            error:
                                "Invalid student or course"
                        });

                    }

                    return res.status(500).json({
                        error:
                            "Failed to update result"
                    });

                }

                if (this.changes === 0) {

                    return res.status(404).json({
                        error:
                            "Result not found"
                    });

                }

                return res.json({

                    message:
                        "Result updated successfully",

                    grade: grade

                });

            }
        );

    }
);


// ======================================================
// DELETE RESULT
// ======================================================

app.delete(
    "/api/results/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const id =
            req.params.id;

        db.run(
            `
            DELETE FROM results
            WHERE id = ?
            `,
            [id],
            function(err) {

                if (err) {

                    console.log(
                        "Delete result error:",
                        err.message
                    );

                    return res.status(500).json({
                        error:
                            "Failed to delete result"
                    });

                }

                if (this.changes === 0) {

                    return res.status(404).json({
                        error:
                            "Result not found"
                    });

                }

                return res.json({

                    message:
                        "Result deleted successfully"

                });

            }
        );

    }
);


// ======================================================
// START SERVER
// ======================================================

db.ready
    .then(() => {
        app.listen(
            PORT,
            () => {
                console.log(
                    `EduManage server running on http://localhost:${PORT}`
                );

                createAdminAccount();
                createMissingStudentAccounts();
            }
        );
    })
    .catch(() => {
        process.exitCode = 1;
    });