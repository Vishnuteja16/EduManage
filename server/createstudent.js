const bcrypt = require("bcryptjs");
const db = require("./database");

const studentDatabaseId = 5;

const name = "Yanamala Sai Vishnu Teja";
const email = "23102a040749@mbu.asia";
const password = "student123";
const role = "student";

bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
        console.log("Password hashing failed:", err.message);
        return;
    }

    const sql = `
        INSERT INTO users
        (name, email, password, role, student_id)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [name, email, hashedPassword, role, studentDatabaseId],
        function(err) {
            if (err) {
                console.log(
                    "Failed to create student account:",
                    err.message
                );
                return;
            }

            console.log("=================================");
            console.log("Student account created successfully");
            console.log("Email:", email);
            console.log("Password:", password);
            console.log("Student DB ID:", studentDatabaseId);
            console.log("=================================");
        }
    );
});