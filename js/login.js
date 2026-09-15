// ======================================================
// EduManage Login
// ======================================================

const API_URL = "http://localhost:5000/api";

const loginForm =
    document.getElementById("login-form");


loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const email =
            document.getElementById("login-email")
                .value
                .trim();


        const password =
            document.getElementById("login-password")
                .value
                .trim();


        const errorMessage =
            document.getElementById("login-error");


        // Hide previous error

        errorMessage.classList.add("hidden");


        try {

            // Send login request

            const response =
                await fetch(
                    `${API_URL}/auth/login`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            email: email,
                            password: password
                        })
                    }
                );


            const data =
                await response.json();


            // Login failed

            if (!response.ok) {

                errorMessage.textContent =
                    data.error ||
                    "Invalid email or password.";

                errorMessage.classList.remove(
                    "hidden"
                );

                return;
            }


            // Store JWT

            sessionStorage.setItem(
                "edumanageToken",
                data.token
            );


            // Store login status

            sessionStorage.setItem(
                "edumanageLoggedIn",
                "true"
            );


            // Store user information

            sessionStorage.setItem(
                "edumanageUser",
                JSON.stringify(data.user)
            );


            // Store role

            sessionStorage.setItem(
                "edumanageRole",
                data.user.role
            );


            // Start from dashboard

            sessionStorage.setItem(
                "currentPage",
                "dashboard"
            );


            // Open EduManage

            window.location.href =
                "index.html";

        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            errorMessage.textContent =
                "Unable to connect to the server.";

            errorMessage.classList.remove(
                "hidden"
            );
        }
    }
);