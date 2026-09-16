// ======================================================
// EduManage - Main JavaScript
// ======================================================


// ======================================================
// API
// ======================================================

const API_URL =
    window.location.protocol === "file:"
        ? "http://localhost:5000/api"
        : "/api";


// ======================================================
// AUTHENTICATION
// ======================================================

function getToken() {
    return sessionStorage.getItem("edumanageToken");
}


function getCurrentUser() {
    try {
        return JSON.parse(
            sessionStorage.getItem("edumanageUser") || "null"
        );
    } catch (error) {
        console.error("User data error:", error);
        return null;
    }
}


function getUserRole() {
    return sessionStorage.getItem("edumanageRole");
}


function isLoggedIn() {
    return (
        sessionStorage.getItem("edumanageLoggedIn") === "true" &&
        !!getToken() &&
        !!getCurrentUser()
    );
}


const currentUser = getCurrentUser();


// ======================================================
// AUTHENTICATION GUARD
// ======================================================

if (!isLoggedIn()) {
    window.location.href = "login.html";
}


// ======================================================
// API HEADERS
// ======================================================

function getHeaders() {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json"
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}


// ======================================================
// API RESPONSE HELPER
// ======================================================

async function getResponseData(response) {

    const text = await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        return {
            error: text
        };
    }
}


// ======================================================
// AUTH ERROR HANDLER
// ======================================================

function handleAuthError(response, data) {

    if (
        response.status === 401 ||
        response.status === 403
    ) {

        console.error(
            "Authentication/Authorization error:",
            data
        );

        alert(
            data.error ||
            "Your session has expired or you do not have permission."
        );

        sessionStorage.removeItem("edumanageLoggedIn");
        sessionStorage.removeItem("edumanageRole");
        sessionStorage.removeItem("edumanageToken");
        sessionStorage.removeItem("edumanageUser");
        sessionStorage.removeItem("currentPage");

        window.location.href = "login.html";

        return true;
    }

    return false;
}


// ======================================================
// ROLE CHECK
// ======================================================

function isAdmin() {
    return getUserRole() === "admin";
}


function isStudent() {
    return getUserRole() === "student";
}


// ======================================================
// PAGE NAVIGATION
// ======================================================

function navigateTo(page) {

    if (
        isStudent() &&
        (
            page === "course" ||
            page === "student" ||
            page === "enrollments" ||
            page === "result"
        )
    ) {

        alert(
            "You do not have permission to access this page."
        );

        navigateTo("dashboard");

        return;
    }


    if (page !== "closed") {

        sessionStorage.setItem(
            "currentPage",
            page
        );
    }


    document
        .querySelectorAll(".page-section")
        .forEach(section => {

            section.classList.add("hidden");

        });


    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.remove("active");

        });


    const selectedPage =
        document.getElementById(
            "page-" + page
        );


    if (selectedPage) {

        selectedPage.classList.remove("hidden");

    }


    const selectedNav =
        document.querySelector(
            `.nav-item[data-page="${page}"]`
        );


    if (selectedNav) {

        selectedNav.classList.add("active");

    }


    const titles = {

        dashboard: "Dashboard",

        course: "Course Management",

        "my-courses": "My Courses",

        student: "Student Management",

        enrollments: "Enrollment Management",

        result: "Result Management",

        "view-results": "View Results",

        logout: "Logout",

        exit: "Exit"
    };


    const header =
        document.getElementById(
            "header-title"
        );


    if (header) {

        header.textContent =
            titles[page] || "";

    }


    if (page === "dashboard") {
        updateDashboard();
    }


    if (page === "course") {
        loadCourses();
    }


    if (page === "my-courses") {
        loadMyCourses();
    }


    if (page === "student") {
        loadStudents();
    }


    if (page === "enrollments") {

        loadEnrollmentForm();

        loadEnrollments();

    }


    if (page === "result") {
        loadResultForm();
    }


    if (page === "view-results") {
        loadResults();
    }
}


// ======================================================
// LOGOUT
// ======================================================

function performLogout() {

    sessionStorage.removeItem(
        "edumanageLoggedIn"
    );

    sessionStorage.removeItem(
        "edumanageRole"
    );

    sessionStorage.removeItem(
        "edumanageToken"
    );

    sessionStorage.removeItem(
        "edumanageUser"
    );

    sessionStorage.removeItem(
        "currentPage"
    );


    window.location.href =
        "login.html";
}


// ======================================================
// EXIT
// ======================================================

function performExit() {

    sessionStorage.removeItem(
        "edumanageLoggedIn"
    );

    sessionStorage.removeItem(
        "edumanageRole"
    );

    sessionStorage.removeItem(
        "edumanageToken"
    );

    sessionStorage.removeItem(
        "edumanageUser"
    );

    sessionStorage.removeItem(
        "currentPage"
    );


    document
        .querySelectorAll(".page-section")
        .forEach(section => {

            section.classList.add("hidden");

        });


    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.remove("active");

        });


    const closedPage =
        document.getElementById(
            "page-closed"
        );


    if (closedPage) {

        closedPage.classList.remove(
            "hidden"
        );

    }


    const header =
        document.getElementById(
            "header-title"
        );


    if (header) {

        header.textContent =
            "Thank You";

    }


    setTimeout(() => {

        window.location.href =
            "login.html";

    }, 2000);
}


// ======================================================
// COURSE FORM - ADMIN ONLY
// ======================================================

function showCourseForm() {

    if (!isAdmin()) {

        alert(
            "Only administrators can manage courses."
        );

        return;
    }


    const container =
        document.getElementById(
            "course-form-container"
        );

    const title =
        document.getElementById(
            "course-form-title"
        );

    const form =
        document.getElementById(
            "course-form"
        );

    const dbId =
        document.getElementById(
            "course-db-id"
        );


    if (!container || !title || !form || !dbId) {
        return;
    }


    container.classList.remove("hidden");

    title.textContent =
        "Add Course";

    form.reset();

    dbId.value = "";
}


function hideCourseForm() {

    const container =
        document.getElementById(
            "course-form-container"
        );

    const form =
        document.getElementById(
            "course-form"
        );

    const dbId =
        document.getElementById(
            "course-db-id"
        );


    if (container) {
        container.classList.add("hidden");
    }


    if (form) {
        form.reset();
    }


    if (dbId) {
        dbId.value = "";
    }
}


// ======================================================
// COURSE ADD / UPDATE
// ======================================================

const courseForm =
    document.getElementById("course-form");


if (courseForm) {

    courseForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (!isAdmin()) {

                alert(
                    "Only administrators can manage courses."
                );

                return;
            }


            const dbIdElement =
                document.getElementById(
                    "course-db-id"
                );


            const courseIdElement =
                document.getElementById(
                    "course-id"
                );


            const courseNameElement =
                document.getElementById(
                    "course-name"
                );


            const durationElement =
                document.getElementById(
                    "course-duration"
                );


            const feeElement =
                document.getElementById(
                    "course-fee"
                );


            if (
                !dbIdElement ||
                !courseIdElement ||
                !courseNameElement ||
                !durationElement ||
                !feeElement
            ) {

                alert(
                    "Course form fields are missing."
                );

                return;
            }


            const id =
                dbIdElement.value.trim();


            const data = {

                course_id:
                    courseIdElement.value.trim(),

                name:
                    courseNameElement.value.trim(),

                duration:
                    durationElement.value.trim(),

                fee:
                    feeElement.value.trim()
            };


            if (!data.course_id || !data.name) {

                alert(
                    "Course ID and course name are required."
                );

                return;
            }


            try {

                const url =
                    id
                        ? `${API_URL}/courses/${id}`
                        : `${API_URL}/courses`;


                const response =
                    await fetch(
                        url,
                        {

                            method:
                                id
                                    ? "PUT"
                                    : "POST",

                            headers:
                                getHeaders(),

                            body:
                                JSON.stringify(data)

                        }
                    );


                const result =
                    await getResponseData(
                        response
                    );


                if (
                    handleAuthError(
                        response,
                        result
                    )
                ) {
                    return;
                }


                if (!response.ok) {

                    console.error(
                        "Course API error:",
                        result
                    );

                    alert(
                        result.error ||
                        "Unable to save course."
                    );

                    return;
                }


                alert(
                    id
                        ? "Course updated successfully."
                        : "Course added successfully."
                );


                hideCourseForm();

                await loadCourses();

                await updateDashboard();

            }
            catch (error) {

                console.error(
                    "Course error:",
                    error
                );

                alert(
                    "Unable to connect to the server."
                );
            }

        }
    );

}


// ======================================================
// LOAD COURSES
// ======================================================

async function loadCourses() {

    if (!isAdmin()) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/courses`,
                {

                    method: "GET",

                    headers:
                        getHeaders()

                }
            );


        const courses =
            await getResponseData(
                response
            );


        if (
            handleAuthError(
                response,
                courses
            )
        ) {
            return;
        }


        if (!response.ok) {

            throw new Error(
                courses.error ||
                "Unable to load courses."
            );
        }


        const table =
            document.getElementById(
                "course-table-body"
            );


        if (!table) {
            return;
        }


        table.innerHTML = "";


        if (
            !Array.isArray(courses) ||
            courses.length === 0
        ) {

            table.innerHTML = `

                <tr>

                    <td colspan="5"
                        class="px-6 py-10 text-center text-gray-500">

                        <i class="fa-solid fa-book-open
                                  text-3xl
                                  text-gray-300
                                  mb-3">
                        </i>

                        <p>
                            No courses available.
                        </p>

                    </td>

                </tr>

            `;

            return;
        }


        courses.forEach(course => {

            table.innerHTML += `

                <tr class="border-t hover:bg-gray-50">

                    <td class="px-6 py-4">
                        ${course.course_id}
                    </td>

                    <td class="px-6 py-4 font-medium">
                        ${course.name}
                    </td>

                    <td class="px-6 py-4">
                        ${course.duration || "-"}
                    </td>

                    <td class="px-6 py-4">
                        ₹${course.fee ?? 0}
                    </td>

                    <td class="px-6 py-4">

                        <button
                            type="button"
                            onclick="editCourse(${course.id})"
                            class="text-blue-600 mr-4">

                            <i class="fa-solid fa-pen"></i>
                            Edit

                        </button>

                        <button
                            type="button"
                            onclick="deleteCourse(${course.id})"
                            class="text-red-600">

                            <i class="fa-solid fa-trash"></i>
                            Delete

                        </button>

                    </td>

                </tr>

            `;

        });

    }
    catch (error) {

        console.error(
            "Course loading error:",
            error
        );


        const table =
            document.getElementById(
                "course-table-body"
            );


        if (table) {

            table.innerHTML = `

                <tr>

                    <td colspan="5"
                        class="px-6 py-6 text-center text-red-500">

                        Failed to load courses.

                    </td>

                </tr>

            `;

        }
    }
}


// ======================================================
// EDIT COURSE
// ======================================================

async function editCourse(id) {

    if (!isAdmin()) {

        alert(
            "Only administrators can edit courses."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/courses`,
                {

                    method: "GET",

                    headers:
                        getHeaders()

                }
            );


        const courses =
            await getResponseData(
                response
            );


        if (
            handleAuthError(
                response,
                courses
            )
        ) {
            return;
        }


        if (!response.ok) {

            alert(
                courses.error ||
                "Unable to load courses."
            );

            return;
        }


        const course =
            courses.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!course) {

            alert(
                "Course not found."
            );

            return;
        }


        const dbId =
            document.getElementById(
                "course-db-id"
            );


        const courseId =
            document.getElementById(
                "course-id"
            );


        const courseName =
            document.getElementById(
                "course-name"
            );


        const duration =
            document.getElementById(
                "course-duration"
            );


        const fee =
            document.getElementById(
                "course-fee"
            );


        const title =
            document.getElementById(
                "course-form-title"
            );


        const container =
            document.getElementById(
                "course-form-container"
            );


        if (
            !dbId ||
            !courseId ||
            !courseName ||
            !duration ||
            !fee ||
            !title ||
            !container
        ) {

            alert(
                "Course form elements are missing."
            );

            return;
        }


        dbId.value =
            course.id;


        courseId.value =
            course.course_id;


        courseName.value =
            course.name;


        duration.value =
            course.duration || "";


        fee.value =
            course.fee ?? "";


        title.textContent =
            "Update Course";


        container.classList.remove(
            "hidden"
        );

    }
    catch (error) {

        console.error(
            "Edit course error:",
            error
        );

        alert(
            "Unable to load course."
        );
    }
}


// ======================================================
// DELETE COURSE
// ======================================================

async function deleteCourse(id) {

    if (!isAdmin()) {

        alert(
            "Only administrators can delete courses."
        );

        return;
    }


    if (
        !confirm(
            "Are you sure you want to delete this course?"
        )
    ) {

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/courses/${id}`,
                {

                    method: "DELETE",

                    headers:
                        getHeaders()

                }
            );


        const data =
            await getResponseData(
                response
            );


        if (
            handleAuthError(
                response,
                data
            )
        ) {
            return;
        }


        if (!response.ok) {

            console.error(
                "Delete course API error:",
                data
            );

            alert(
                data.error ||
                "Unable to delete course."
            );

            return;
        }


        alert(
            "Course deleted successfully."
        );


        await loadCourses();

        await updateDashboard();

    }
    catch (error) {

        console.error(
            "Delete course error:",
            error
        );

        alert(
            "Unable to connect to the server."
        );
    }
}


// ======================================================
// STUDENT FORM - ADMIN ONLY
// ======================================================

function showStudentForm() {

    if (!isAdmin()) {

        alert(
            "Only administrators can manage students."
        );

        return;
    }


    const container =
        document.getElementById(
            "student-form-container"
        );

    const title =
        document.getElementById(
            "student-form-title"
        );

    const form =
        document.getElementById(
            "student-form"
        );

    const dbId =
        document.getElementById(
            "student-db-id"
        );


    if (
        !container ||
        !title ||
        !form ||
        !dbId
    ) {
        return;
    }


    container.classList.remove(
        "hidden"
    );


    title.textContent =
        "Add Student";


    form.reset();

    dbId.value = "";
}


function hideStudentForm() {

    const container =
        document.getElementById(
            "student-form-container"
        );

    const form =
        document.getElementById(
            "student-form"
        );

    const dbId =
        document.getElementById(
            "student-db-id"
        );


    if (container) {
        container.classList.add("hidden");
    }


    if (form) {
        form.reset();
    }


    if (dbId) {
        dbId.value = "";
    }
}


// ======================================================
// STUDENT ADD / UPDATE
// ======================================================

const studentForm =
    document.getElementById(
        "student-form"
    );


if (studentForm) {

    studentForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (!isAdmin()) {

                alert(
                    "Only administrators can manage students."
                );

                return;
            }


            const idElement =
                document.getElementById(
                    "student-db-id"
                );


            const studentIdElement =
                document.getElementById(
                    "student-id"
                );


            const nameElement =
                document.getElementById(
                    "student-name"
                );


            const emailElement =
                document.getElementById(
                    "student-email"
                );


            const phoneElement =
                document.getElementById(
                    "student-phone"
                );


            if (
                !idElement ||
                !studentIdElement ||
                !nameElement ||
                !emailElement ||
                !phoneElement
            ) {

                alert(
                    "Student form fields are missing."
                );

                return;
            }


            const id =
                idElement.value.trim();


            const data = {

                student_id:
                    studentIdElement.value.trim(),

                name:
                    nameElement.value.trim(),

                email:
                    emailElement.value.trim(),

                phone:
                    phoneElement.value.trim()

            };


            if (
                !data.student_id ||
                !data.name ||
                !data.email
            ) {

                alert(
                    "Student ID, name and email are required."
                );

                return;
            }


            try {

                const url =
                    id
                        ? `${API_URL}/students/${id}`
                        : `${API_URL}/students`;


                const response =
                    await fetch(
                        url,
                        {

                            method:
                                id
                                    ? "PUT"
                                    : "POST",

                            headers:
                                getHeaders(),

                            body:
                                JSON.stringify(data)

                        }
                    );


                const result =
                    await getResponseData(
                        response
                    );


                if (
                    handleAuthError(
                        response,
                        result
                    )
                ) {
                    return;
                }


                if (!response.ok) {

                    console.error(
                        "Student API error:",
                        result
                    );

                    alert(
                        result.error ||
                        "Unable to save student."
                    );

                    return;
                }


                if (id) {

                    alert(
                        "Student updated successfully."
                    );

                }
                else {

                    alert(
                        "Student added successfully."
                    );


                    if (result.login) {

                        alert(
                            "Student login created.\n\n" +
                            "Email: " +
                            result.login.email +
                            "\n" +
                            "Password: " +
                            result.login.password
                        );

                    }
                }


                hideStudentForm();

                await loadStudents();

                await updateDashboard();

            }
            catch (error) {

                console.error(
                    "Student error:",
                    error
                );

                alert(
                    "Unable to connect to the server."
                );
            }

        }
    );

}


// ======================================================
// LOAD STUDENTS
// ======================================================

async function loadStudents() {

    if (!isAdmin()) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/students`,
                {

                    method: "GET",

                    headers:
                        getHeaders()

                }
            );


        const students =
            await getResponseData(
                response
            );


        if (
            handleAuthError(
                response,
                students
            )
        ) {
            return;
        }


        if (!response.ok) {

            throw new Error(
                students.error ||
                "Unable to load students."
            );
        }


        const table =
            document.getElementById(
                "student-table-body"
            );


        if (!table) {
            return;
        }


        table.innerHTML = "";


        if (
            !Array.isArray(students) ||
            students.length === 0
        ) {

            table.innerHTML = `

                <tr>

                    <td colspan="5"
                        class="px-6 py-6 text-center text-gray-500">

                        No students available.

                    </td>

                </tr>

            `;

            return;
        }


        students.forEach(student => {

            table.innerHTML += `

                <tr class="border-t hover:bg-gray-50">

                    <td class="px-6 py-4">
                        ${student.student_id}
                    </td>

                    <td class="px-6 py-4">
                        ${student.name}
                    </td>

                    <td class="px-6 py-4">
                        ${student.email}
                    </td>

                    <td class="px-6 py-4">
                        ${student.phone || "-"}
                    </td>

                    <td class="px-6 py-4">

                        <button
                            type="button"
                            onclick="editStudent(${student.id})"
                            class="text-blue-600 mr-4">

                            <i class="fa-solid fa-pen"></i>
                            Edit

                        </button>

                        <button
                            type="button"
                            onclick="deleteStudent(${student.id})"
                            class="text-red-600">

                            <i class="fa-solid fa-trash"></i>
                            Delete

                        </button>

                    </td>

                </tr>

            `;

        });

    }
    catch (error) {

        console.error(
            "Student loading error:",
            error
        );


        const table =
            document.getElementById(
                "student-table-body"
            );


        if (table) {

            table.innerHTML = `

                <tr>

                    <td colspan="5"
                        class="px-6 py-6 text-center text-red-500">

                        Failed to load students.

                    </td>

                </tr>

            `;
        }
    }
}


// ======================================================
// EDIT STUDENT
// ======================================================

async function editStudent(id) {

    if (!isAdmin()) {

        alert(
            "Only administrators can edit students."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/students`,
                {

                    method: "GET",

                    headers:
                        getHeaders()

                }
            );


        const students =
            await getResponseData(
                response
            );


        if (
            handleAuthError(
                response,
                students
            )
        ) {
            return;
        }


        if (!response.ok) {

            alert(
                students.error ||
                "Unable to load students."
            );

            return;
        }


        const student =
            students.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!student) {

            alert(
                "Student not found."
            );

            return;
        }


        const dbId =
            document.getElementById(
                "student-db-id"
            );


        const studentId =
            document.getElementById(
                "student-id"
            );


        const name =
            document.getElementById(
                "student-name"
            );


        const email =
            document.getElementById(
                "student-email"
            );


        const phone =
            document.getElementById(
                "student-phone"
            );


        const title =
            document.getElementById(
                "student-form-title"
            );


        const container =
            document.getElementById(
                "student-form-container"
            );


        if (
            !dbId ||
            !studentId ||
            !name ||
            !email ||
            !phone ||
            !title ||
            !container
        ) {

            alert(
                "Student form elements are missing."
            );

            return;
        }


        dbId.value =
            student.id;


        studentId.value =
            student.student_id;


        name.value =
            student.name;


        email.value =
            student.email;


        phone.value =
            student.phone || "";


        title.textContent =
            "Update Student";


        container.classList.remove(
            "hidden"
        );

    }
    catch (error) {

        console.error(
            "Edit student error:",
            error
        );

        alert(
            "Unable to load student."
        );
    }
}


// ======================================================
// DELETE STUDENT
// ======================================================

async function deleteStudent(id) {

    if (!isAdmin()) {

        alert(
            "Only administrators can delete students."
        );

        return;
    }


    if (
        !confirm(
            "Are you sure you want to delete this student?\n\n" +
            "Their enrollments, results and student login account " +
            "will also be removed."
        )
    ) {

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/students/${id}`,
                {

                    method: "DELETE",

                    headers:
                        getHeaders()

                }
            );


        const data =
            await getResponseData(
                response
            );


        if (
            handleAuthError(
                response,
                data
            )
        ) {
            return;
        }


        if (!response.ok) {

            console.error(
                "Delete student API error:",
                data
            );

            alert(
                data.error ||
                "Unable to delete student."
            );

            return;
        }


        alert(
            "Student deleted successfully."
        );


        await loadStudents();

        await updateDashboard();

    }
    catch (error) {

        console.error(
            "Delete student error:",
            error
        );

        alert(
            "Unable to connect to the server."
        );
    }
}


// ======================================================
// ENROLLMENT - LOAD STUDENTS AND COURSES
// ======================================================

async function loadEnrollmentForm() {

    if (!isAdmin()) {
        return;
    }


    const studentSelect =
        document.getElementById(
            "enrollment-student"
        );


    const courseSelect =
        document.getElementById(
            "enrollment-course"
        );


    if (
        !studentSelect ||
        !courseSelect
    ) {
        return;
    }


    try {

        const studentResponse =
            await fetch(
                `${API_URL}/students`,
                {

                    method: "GET",

                    headers:
                        getHeaders()

                }
            );


        const students =
            await getResponseData(
                studentResponse
            );


        if (
            handleAuthError(
                studentResponse,
                students
            )
        ) {
            return;
        }


        const courseResponse =
            await fetch(
                `${API_URL}/courses`,
                {

                    method: "GET",

                    headers:
                        getHeaders()

                }
            );


        const courses =
            await getResponseData(
                courseResponse
            );


        if (
            handleAuthError(
                courseResponse,
                courses
            )
        ) {
            return;
        }


        if (
            !studentResponse.ok ||
            !courseResponse.ok
        ) {

            throw new Error(
                "Unable to load students or courses."
            );
        }


        studentSelect.innerHTML = `

            <option value="">
                Select Student
            </option>

        `;


        courseSelect.innerHTML = `

            <option value="">
                Select Course
            </option>

        `;


        students.forEach(student => {

            studentSelect.innerHTML += `

                <option value="${student.id}">

                    ${student.student_id}
                    - ${student.name}

                </option>

            `;

        });


        courses.forEach(course => {

            courseSelect.innerHTML += `

                <option value="${course.id}">

                    ${course.course_id}
                    - ${course.name}

                </option>

            `;

        });

    }
    catch (error) {

        console.error(
            "Enrollment form error:",
            error
        );
    }
}


// ======================================================
// ADD ENROLLMENT
// ======================================================

async function addEnrollment(event) {

    event.preventDefault();


    if (!isAdmin()) {

        alert(
            "Only administrators can manage enrollments."
        );

        return;
    }


    const studentId =
        document
            .getElementById(
                "enrollment-student"
            )
            .value;


    const courseId =
        document
            .getElementById(
                "enrollment-course"
            )
            .value;


    if (
        !studentId ||
        !courseId
    ) {

        alert(
            "Please select a student and course."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/enrollments`,
                {

                    method: "POST",

                    headers:
                        getHeaders(),

                    body:
                        JSON.stringify({

                            student_id:
                                Number(studentId),

                            course_id:
                                Number(courseId)

                        })

                }
            );


        const data =
            await getResponseData(
                response
            );


        if (
            handleAuthError(
                response,
                data
            )
        ) {
            return;
        }


        if (!response.ok) {

            alert(
                data.error ||
                "Unable to enroll student."
            );

            return;
        }


        alert(
            "Student enrolled successfully."
        );


        const form =
            document.getElementById(
                "enrollment-form"
            );


        if (form) {
            form.reset();
        }


        await loadEnrollments();

        await updateDashboard();

    }
    catch (error) {

        console.error(
            "Enrollment error:",
            error
        );

        alert(
            "Unable to connect to the server."
        );
    }
}


// ======================================================
// LOAD ALL ENROLLMENTS
// ======================================================

async function loadEnrollments() {

    if (!isAdmin()) {
        return;
    }


    const table =
        document.getElementById(
            "enrollment-table-body"
        );


    if (!table) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/enrollments`,
                {

                    method: "GET",

                    headers:
                        getHeaders()

                }
            );


        const enrollments =
            await getResponseData(
                response
            );


        if (
            handleAuthError(
                response,
                enrollments
            )
        ) {
            return;
        }


        if (!response.ok) {

            throw new Error(
                enrollments.error ||
                "Unable to load enrollments."
            );
        }


        table.innerHTML = "";


        if (
            !Array.isArray(enrollments) ||
            enrollments.length === 0
        ) {

            table.innerHTML = `

                <tr>

                    <td colspan="5"
                        class="px-6 py-6 text-center text-gray-500">

                        No enrollments available.

                    </td>

                </tr>

            `;

            return;
        }


        enrollments.forEach(enrollment => {

            table.innerHTML += `

                <tr class="border-t hover:bg-gray-50">

                    <td class="px-6 py-4">
                        ${enrollment.student_id}
                    </td>

                    <td class="px-6 py-4">
                        ${enrollment.student_name}
                    </td>

                    <td class="px-6 py-4">
                        ${enrollment.course_id}
                    </td>

                    <td class="px-6 py-4">
                        ${enrollment.course_name}
                    </td>

                    <td class="px-6 py-4">

                        <button
                            type="button"
                            onclick="deleteEnrollment(${enrollment.id})"
                            class="text-red-600">

                            <i class="fa-solid fa-trash"></i>
                            Remove

                        </button>

                    </td>

                </tr>

            `;

        });

    }
    catch (error) {

        console.error(
            "Enrollment loading error:",
            error
        );
    }
}


// ======================================================
// DELETE ENROLLMENT
// ======================================================

async function deleteEnrollment(id) {

    if (!isAdmin()) {

        alert(
            "Only administrators can remove enrollments."
        );

        return;
    }


    if (
        !confirm(
            "Are you sure you want to remove this enrollment?"
        )
    ) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/enrollments/${id}`,
                {

                    method: "DELETE",

                    headers:
                        getHeaders()

                }
            );


        const data =
            await getResponseData(
                response
            );


        if (
            handleAuthError(
                response,
                data
            )
        ) {
            return;
        }


        if (!response.ok) {

            alert(
                data.error ||
                "Unable to remove enrollment."
            );

            return;
        }


        alert(
            "Enrollment removed successfully."
        );


        await loadEnrollments();

        await updateDashboard();

    }
    catch (error) {

        console.error(
            "Delete enrollment error:",
            error
        );

        alert(
            "Unable to connect to the server."
        );
    }
}


// ======================================================
// STUDENT - MY COURSES
// ======================================================

async function loadMyCourses() {

    if (!isStudent()) {
        return;
    }


    const table =
        document.getElementById(
            "my-course-table-body"
        );


    const count =
        document.getElementById(
            "my-course-count"
        );


    const studentName =
        document.getElementById(
            "my-course-student-name"
        );


    if (!table) {

        console.error(
            "My Courses table not found."
        );

        return;
    }


    if (
        studentName &&
        currentUser
    ) {

        studentName.textContent =
            currentUser.name || "-";
    }


    table.innerHTML = `

        <tr>

            <td colspan="5"
                class="px-6 py-10 text-center text-gray-500">

                <i class="fa-solid fa-spinner fa-spin mr-2"></i>

                Loading courses...

            </td>

        </tr>

    `;


    try {

        const response =
            await fetch(
                `${API_URL}/my-courses`,
                {

                    method: "GET",

                    headers:
                        getHeaders()

                }
            );


        const courses =
            await getResponseData(
                response
            );


        if (
            handleAuthError(
                response,
                courses
            )
        ) {
            return;
        }


        if (!response.ok) {

            throw new Error(
                courses.error ||
                "Unable to load your courses."
            );
        }


        if (count) {

            count.textContent =
                courses.length;
        }


        const dashboardCourseCount =
            document.getElementById(
                "dashboard-course-count"
            );


        if (dashboardCourseCount) {

            dashboardCourseCount.textContent =
                courses.length;
        }


        table.innerHTML = "";


        if (
            !Array.isArray(courses) ||
            courses.length === 0
        ) {

            table.innerHTML = `

                <tr>

                    <td colspan="5"
                        class="px-6 py-10 text-center text-gray-500">

                        <i class="fa-solid fa-book-open
                                  text-3xl
                                  text-gray-300
                                  mb-3">
                        </i>

                        <p class="font-medium">

                            You are not enrolled
                            in any courses yet.

                        </p>

                        <p class="text-sm mt-1">

                            Please contact the administrator
                            for course enrollment.

                        </p>

                    </td>

                </tr>

            `;

            return;
        }


        courses.forEach(course => {

            table.innerHTML += `

                <tr class="border-t hover:bg-gray-50">

                    <td class="px-6 py-4">
                        ${course.course_id}
                    </td>

                    <td class="px-6 py-4 font-medium">
                        ${course.name}
                    </td>

                    <td class="px-6 py-4">
                        ${course.duration || "-"}
                    </td>

                    <td class="px-6 py-4">
                        ₹${course.fee ?? 0}
                    </td>

                    <td class="px-6 py-4">

                        <span
                            class="inline-flex
                                   items-center
                                   px-2.5
                                   py-1
                                   rounded-full
                                   text-xs
                                   font-medium
                                   bg-green-100
                                   text-green-700">

                            <i class="fa-solid fa-check mr-1"></i>

                            Enrolled

                        </span>

                    </td>

                </tr>

            `;

        });

    }
    catch (error) {

        console.error(
            "My courses error:",
            error
        );


        if (count) {
            count.textContent = "0";
        }


        table.innerHTML = `

            <tr>

                <td colspan="5"
                    class="px-6 py-6 text-center text-red-500">

                    Failed to load your courses.

                    <p class="text-sm mt-1">

                        Please check whether the server is running.

                    </p>

                </td>

            </tr>

        `;

    }
}


// ======================================================
// RESULT - LOAD STUDENTS & COURSES
// ======================================================

async function loadResultForm() {

    if (!isAdmin()) {
        return;
    }


    try {

        const studentResponse =
            await fetch(
                `${API_URL}/students`,
                {

                    method: "GET",

                    headers:
                        getHeaders()

                }
            );


        const students =
            await getResponseData(
                studentResponse
            );


        if (
            handleAuthError(
                studentResponse,
                students
            )
        ) {
            return;
        }


        const courseResponse =
            await fetch(
                `${API_URL}/courses`,
                {

                    method: "GET",

                    headers:
                        getHeaders()

                }
            );


        const courses =
            await getResponseData(
                courseResponse
            );


        if (
            handleAuthError(
                courseResponse,
                courses
            )
        ) {
            return;
        }


        const enrollmentResponse =
            await fetch(
                `${API_URL}/enrollments`,
                {

                    method: "GET",

                    headers:
                        getHeaders()

                }
            );


        const enrollments =
            await getResponseData(
                enrollmentResponse
            );


        if (
            handleAuthError(
                enrollmentResponse,
                enrollments
            )
        ) {
            return;
        }


        if (
            !studentResponse.ok ||
            !courseResponse.ok ||
            !enrollmentResponse.ok
        ) {

            throw new Error(
                "Unable to load students or courses."
            );
        }


        const studentSelect =
            document.getElementById(
                "result-student"
            );


        const courseSelect =
            document.getElementById(
                "result-course"
            );


        if (
            !studentSelect ||
            !courseSelect
        ) {
            return;
        }


        studentSelect.innerHTML = `

            <option value="">
                Select Student
            </option>

        `;


        courseSelect.innerHTML = `

            <option value="">
                Select a student first
            </option>

        `;


        students.forEach(student => {

            const hasEnrollment =
                enrollments.some(
                    (enrollment) =>
                        String(enrollment.student_db_id) ===
                            String(student.id)
                );

            if (!hasEnrollment) {
                return;
            }

            studentSelect.innerHTML += `

                <option value="${student.id}">

                    ${student.student_id}
                    - ${student.name}

                </option>

            `;

        });


        function renderResultCourses(studentId) {

            const enrolledCourseIds =
                new Set(
                    enrollments
                        .filter(
                            (enrollment) =>
                                String(enrollment.student_db_id) ===
                                    String(studentId)
                        )
                        .map(
                            (enrollment) =>
                                String(enrollment.course_db_id)
                        )
                );

            courseSelect.innerHTML = `

                <option value="">
                    Select Course
                </option>

            `;

            courses
                .filter(
                    (course) =>
                        enrolledCourseIds.has(
                            String(course.id)
                        )
                )
                .forEach(course => {

                    courseSelect.innerHTML += `

                        <option value="${course.id}">

                            ${course.course_id}
                            - ${course.name}

                        </option>

                    `;

                });
        }

        studentSelect.addEventListener(
            "change",
            () => renderResultCourses(studentSelect.value)
        );

    }
    catch (error) {

        console.error(
            "Result form error:",
            error
        );
    }
}


// ======================================================
// AUTOMATIC GRADE
// ======================================================

function calculateGrade(marks) {

    if (marks >= 90) return "A+";

    if (marks >= 80) return "A";

    if (marks >= 70) return "B";

    if (marks >= 60) return "C";

    if (marks >= 50) return "D";

    if (marks >= 40) return "E";

    return "F";
}


// ======================================================
// GRADE PREVIEW
// ======================================================

const resultMarks =
    document.getElementById(
        "result-marks"
    );


if (resultMarks) {

    resultMarks.addEventListener(
        "input",
        function () {

            const gradeField =
                document.getElementById(
                    "result-grade"
                );


            if (!gradeField) {
                return;
            }


            if (this.value === "") {

                gradeField.value = "";

                return;
            }


            const marks =
                Number(this.value);


            if (
                marks < 0 ||
                marks > 100
            ) {

                gradeField.value = "";

                return;
            }


            gradeField.value =
                calculateGrade(marks);

        }
    );

}


// ======================================================
// ADD RESULT
// ======================================================

const resultForm =
    document.getElementById(
        "result-form"
    );


if (resultForm) {

    resultForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (!isAdmin()) {

                alert(
                    "Only administrators can add results."
                );

                return;
            }


            const student_id =
                document
                    .getElementById(
                        "result-student"
                    )
                    .value;


            const course_id =
                document
                    .getElementById(
                        "result-course"
                    )
                    .value;


            const marks =
                Number(
                    document
                        .getElementById(
                            "result-marks"
                        )
                        .value
                );


            if (
                !student_id ||
                !course_id
            ) {

                alert(
                    "Please select a student and course."
                );

                return;
            }


            if (
                isNaN(marks) ||
                marks < 0 ||
                marks > 100
            ) {

                alert(
                    "Marks must be between 0 and 100."
                );

                return;
            }


            try {

                const response =
                    await fetch(
                        `${API_URL}/results`,
                        {

                            method: "POST",

                            headers:
                                getHeaders(),

                            body:
                                JSON.stringify({

                                    student_id,

                                    course_id,

                                    marks

                                })

                        }
                    );


                const data =
                    await getResponseData(
                        response
                    );


                if (
                    handleAuthError(
                        response,
                        data
                    )
                ) {
                    return;
                }


                if (!response.ok) {

                    alert(
                        data.error ||
                        "Unable to save result."
                    );

                    return;
                }


                alert(
                    "Result added successfully."
                );


                resultForm.reset();


                const gradeField =
                    document.getElementById(
                        "result-grade"
                    );


                if (gradeField) {
                    gradeField.value = "";
                }


                await updateDashboard();

            }
            catch (error) {

                console.error(
                    "Result error:",
                    error
                );

                alert(
                    "Unable to connect to the server."
                );
            }
        }
    );

}


// ======================================================
// LOAD RESULTS
// ======================================================

async function loadResults() {

    try {

        let url =
            `${API_URL}/results`;


        if (isStudent()) {

            url =
                `${API_URL}/my-results`;

        }


        const response =
            await fetch(
                url,
                {

                    method: "GET",

                    headers:
                        getHeaders()

                }
            );


        const results =
            await getResponseData(
                response
            );


        if (
            handleAuthError(
                response,
                results
            )
        ) {
            return;
        }


        if (!response.ok) {

            throw new Error(
                results.error ||
                "Unable to load results."
            );
        }


        const table =
            document.getElementById(
                "results-table-body"
            );


        if (!table) {
            return;
        }


        table.innerHTML = "";


        if (
            !Array.isArray(results) ||
            results.length === 0
        ) {

            table.innerHTML = `

                <tr>

                    <td colspan="5"
                        class="px-6 py-6 text-center text-gray-500">

                        No results available.

                    </td>

                </tr>

            `;

            return;
        }


        results.forEach(result => {

            table.innerHTML += `

                <tr class="border-t hover:bg-gray-50">

                    <td class="px-6 py-4">
                        ${result.student_id}
                    </td>

                    <td class="px-6 py-4">
                        ${result.student_name}
                    </td>

                    <td class="px-6 py-4">
                        ${result.course_name}
                    </td>

                    <td class="px-6 py-4">
                        ${result.marks}
                    </td>

                    <td class="px-6 py-4 font-semibold">
                        ${result.grade}
                    </td>

                </tr>

            `;

        });


        const count =
            document.getElementById(
                "dashboard-result-count"
            );


        if (count) {

            count.textContent =
                results.length;

        }

    }
    catch (error) {

        console.error(
            "Result loading error:",
            error
        );

    }
}


// ======================================================
// DASHBOARD
// ======================================================

async function updateDashboard() {

    try {

        let students = [];

        let courses = [];

        let results = [];


        // ==================================================
        // ADMIN DASHBOARD
        // ==================================================

        if (isAdmin()) {

            const studentResponse =
                await fetch(
                    `${API_URL}/students`,
                    {

                        method: "GET",

                        headers:
                            getHeaders()

                    }
                );


            students =
                await getResponseData(
                    studentResponse
                );


            if (
                handleAuthError(
                    studentResponse,
                    students
                )
            ) {
                return;
            }


            const courseResponse =
                await fetch(
                    `${API_URL}/courses`,
                    {

                        method: "GET",

                        headers:
                            getHeaders()

                    }
                );


            courses =
                await getResponseData(
                    courseResponse
                );


            if (
                handleAuthError(
                    courseResponse,
                    courses
                )
            ) {
                return;
            }


            const resultResponse =
                await fetch(
                    `${API_URL}/results`,
                    {

                        method: "GET",

                        headers:
                            getHeaders()

                    }
                );


            results =
                await getResponseData(
                    resultResponse
                );


            if (
                handleAuthError(
                    resultResponse,
                    results
                )
            ) {
                return;
            }


            if (
                !studentResponse.ok ||
                !courseResponse.ok ||
                !resultResponse.ok
            ) {

                throw new Error(
                    "Unable to load dashboard data."
                );
            }

        }


        // ==================================================
        // STUDENT DASHBOARD
        // ==================================================

        if (isStudent()) {

            const courseResponse =
                await fetch(
                    `${API_URL}/my-courses`,
                    {

                        method: "GET",

                        headers:
                            getHeaders()

                    }
                );


            courses =
                await getResponseData(
                    courseResponse
                );


            if (
                handleAuthError(
                    courseResponse,
                    courses
                )
            ) {
                return;
            }


            if (!courseResponse.ok) {

                throw new Error(
                    "Unable to load enrolled courses."
                );
            }


            const resultResponse =
                await fetch(
                    `${API_URL}/my-results`,
                    {

                        method: "GET",

                        headers:
                            getHeaders()

                    }
                );


            results =
                await getResponseData(
                    resultResponse
                );


            if (
                handleAuthError(
                    resultResponse,
                    results
                )
            ) {
                return;
            }


            if (!resultResponse.ok) {

                throw new Error(
                    "Unable to load results."
                );
            }

        }


        // ==================================================
        // DASHBOARD ELEMENTS
        // ==================================================

        const studentCount =
            document.getElementById(
                "dashboard-student-count"
            );


        const courseCount =
            document.getElementById(
                "dashboard-course-count"
            );


        const resultCount =
            document.getElementById(
                "dashboard-result-count"
            );


        const studentLabel =
            document.getElementById(
                "dashboard-student-label"
            );


        const courseLabel =
            document.getElementById(
                "dashboard-course-label"
            );


        const resultLabel =
            document.getElementById(
                "dashboard-result-label"
            );


        // ==================================================
        // ADMIN DASHBOARD
        // ==================================================

        if (isAdmin()) {

            if (studentCount) {
                studentCount.textContent =
                    students.length;
            }


            if (courseCount) {
                courseCount.textContent =
                    courses.length;
            }


            if (resultCount) {
                resultCount.textContent =
                    results.length;
            }


            if (studentLabel) {
                studentLabel.textContent =
                    "Total Students";
            }


            if (courseLabel) {
                courseLabel.textContent =
                    "Total Courses";
            }


            if (resultLabel) {
                resultLabel.textContent =
                    "Total Results";
            }

        }


        // ==================================================
        // STUDENT DASHBOARD
        // ==================================================

        if (isStudent()) {

            if (studentCount) {
                studentCount.textContent =
                    "1";
            }


            if (courseCount) {
                courseCount.textContent =
                    courses.length;
            }


            if (resultCount) {
                resultCount.textContent =
                    results.length;
            }


            if (studentLabel) {
                studentLabel.textContent =
                    "My Profile";
            }


            if (courseLabel) {
                courseLabel.textContent =
                    "My Enrolled Courses";
            }


            if (resultLabel) {
                resultLabel.textContent =
                    "My Results";
            }


            const welcomeCard =
                document.getElementById(
                    "student-dashboard-card"
                );


            const welcomeName =
                document.getElementById(
                    "dashboard-user-name"
                );


            if (welcomeCard) {

                welcomeCard.classList.remove(
                    "hidden"
                );

            }


            if (
                welcomeName &&
                currentUser
            ) {

                welcomeName.textContent =
                    currentUser.name ||
                    "Student";

            }

        }

    }
    catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

    }
}


// ======================================================
// SEARCH
// ======================================================

function addSearch(
    inputId,
    tableId
) {

    const input =
        document.getElementById(
            inputId
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        function () {

            const text =
                this.value.toLowerCase();


            document
                .querySelectorAll(
                    `#${tableId} tr`
                )
                .forEach(row => {

                    row.style.display =
                        row.textContent
                            .toLowerCase()
                            .includes(text)
                            ? ""
                            : "none";

                });

        }
    );
}


// ======================================================
// SEARCH INPUTS
// ======================================================

addSearch(
    "course-search",
    "course-table-body"
);


addSearch(
    "student-search",
    "student-table-body"
);


addSearch(
    "result-search",
    "results-table-body"
);


addSearch(
    "enrollment-search",
    "enrollment-table-body"
);


addSearch(
    "my-course-search",
    "my-course-table-body"
);


// ======================================================
// ROLE-BASED NAVIGATION
// ======================================================

function applyRolePermissions() {

    const adminPages = [

        "course",

        "student",

        "enrollments",

        "result"

    ];


    adminPages.forEach(page => {

        const nav =
            document.querySelector(
                `.nav-item[data-page="${page}"]`
            );


        if (!nav) {
            return;
        }


        if (isAdmin()) {

            nav.classList.remove(
                "hidden"
            );

        }
        else {

            nav.classList.add(
                "hidden"
            );

        }

    });


    // ==================================================
    // STUDENT-ONLY MY COURSES
    // ==================================================

    const myCoursesNav =
        document.querySelector(
            `.nav-item[data-page="my-courses"]`
        );


    if (myCoursesNav) {

        if (isStudent()) {

            myCoursesNav.classList.remove(
                "hidden"
            );

        }
        else {

            myCoursesNav.classList.add(
                "hidden"
            );

        }

    }


    // ==================================================
    // VIEW RESULTS
    // ==================================================

    const resultNav =
        document.querySelector(
            `.nav-item[data-page="view-results"]`
        );


    if (resultNav) {

        resultNav.classList.remove(
            "hidden"
        );

    }


    // ==================================================
    // SIDEBAR USER INFORMATION
    // ==================================================

    const userName =
        document.getElementById(
            "sidebar-user-name"
        );


    const userRoleElement =
        document.getElementById(
            "sidebar-user-role"
        );


    const user =
        getCurrentUser();


    if (
        userName &&
        user
    ) {

        userName.textContent =
            user.name || "User";

    }


    if (userRoleElement) {

        userRoleElement.textContent =
            isAdmin()
                ? "Administrator"
                : "Student";

    }
}


// ======================================================
// PAGE LOAD
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        applyRolePermissions();


        const savedPage =
            sessionStorage.getItem(
                "currentPage"
            ) || "dashboard";


        if (
            isStudent() &&
            (
                savedPage === "course" ||
                savedPage === "student" ||
                savedPage === "enrollments" ||
                savedPage === "result"
            )
        ) {

            navigateTo("dashboard");

            return;
        }


        navigateTo(savedPage);

    }
);