const bcrypt = require("bcryptjs");
const db = require("./database");

const name = "EduManage Admin";
const email = "admin@edumanage.com";
const password = "admin123";
const role = "admin";

bcrypt.hash(password, 10, (err, hashedPassword) => {

    if (err) {

        console.log(
            "Password hashing failed:",
            err.message
        );

        return;

    }


    const sql = `

        INSERT INTO users
        (
            name,
            email,
            password,
            role
        )

        VALUES (?, ?, ?, ?)

    `;


    db.run(
        sql,
        [
            name,
            email,
            hashedPassword,
            role
        ],
        function(err) {

            if (err) {

                console.log(
                    "Failed to create admin:",
                    err.message
                );

                return;

            }


            console.log(
                "================================="
            );

            console.log(
                "Admin account created successfully"
            );

            console.log(
                "Email:",
                email
            );

            console.log(
                "Password:",
                password
            );

            console.log(
                "================================="
            );

        }
    );

});