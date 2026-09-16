const path = require("path");

// ======================================================
// LOAD ENVIRONMENT VARIABLES
// ======================================================

require("dotenv").config({
    path: path.join(__dirname, "..", ".env")
});

const mongoose = require("mongoose");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error(
        "DATABASE_URL is required to connect to MongoDB"
    );
}

const databaseName =
    process.env.MONGODB_DATABASE || "edumanage";

let database;

// ======================================================
// COLLECTION
// ======================================================

function collection(name) {
    return database.collection(name);
}

// ======================================================
// NORMALIZE SQL
// ======================================================

function normalize(sql) {
    return sql.replace(/\s+/g, " ").trim();
}

// ======================================================
// SPLIT VALUES
// ======================================================

function splitValues(valueText) {
    return valueText
        .match(/(?:[^,']|'[^']*')+/g)
        .map((value) => value.trim());
}

// ======================================================
// VALUE FROM TOKEN
// ======================================================

function valueFromToken(
    token,
    params,
    parameterIndex
) {
    const cleanToken = token.trim();

    if (cleanToken === "?") {
        return params[parameterIndex.value++];
    }

    if (/^null$/i.test(cleanToken)) {
        return null;
    }

    if (/^'.*'$/.test(cleanToken)) {
        return cleanToken
            .slice(1, -1)
            .replace(/''/g, "'");
    }

    const numericValue = Number(cleanToken);

    return Number.isNaN(numericValue)
        ? cleanToken
        : numericValue;
}

// ======================================================
// NORMALIZE ID
// ======================================================

function normalizeId(value) {
    const numericValue = Number(value);

    return Number.isNaN(numericValue)
        ? value
        : numericValue;
}

// ======================================================
// NORMALIZE FIELD VALUE
// ======================================================

function normalizeFieldValue(field, value) {
    return [
        "id",
        "student_id",
        "course_id"
    ].includes(field)
        ? normalizeId(value)
        : value;
}

// ======================================================
// GENERATE NEXT ID
// ======================================================

async function nextId(name) {
    const lastDocument =
        await collection(name)
            .find()
            .sort({ id: -1 })
            .limit(1)
            .next();

    return (lastDocument?.id || 0) + 1;
}

// ======================================================
// ERROR HELPERS
// ======================================================

function duplicateError() {
    return new Error(
        "UNIQUE constraint failed"
    );
}

function foreignKeyError() {
    return new Error(
        "FOREIGN KEY constraint failed"
    );
}

// ======================================================
// CHECK REFERENCES
// ======================================================

async function ensureReferences(table, document) {

    if (
        table !== "enrollments" &&
        table !== "results"
    ) {
        return;
    }

    if (
        document.student_id !== undefined &&
        !(await collection("students").findOne({
            id: document.student_id
        }))
    ) {
        throw foreignKeyError();
    }

    if (
        document.course_id !== undefined &&
        !(await collection("courses").findOne({
            id: document.course_id
        }))
    ) {
        throw foreignKeyError();
    }

    if (
        table === "results" &&
        !(await collection("enrollments").findOne({
            student_id: document.student_id,
            course_id: document.course_id
        }))
    ) {
        throw foreignKeyError();
    }
}

// ======================================================
// INSERT
// ======================================================

async function insert(sql, params) {

    const match =
        normalize(sql).match(
            /^INSERT INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)$/i
        );

    if (!match) {
        throw new Error(
            `Unsupported INSERT query: ${sql}`
        );
    }

    const [
        ,
        table,
        columnsText,
        valuesText
    ] = match;

    const columns =
        columnsText
            .split(",")
            .map((column) => column.trim());

    const tokens =
        splitValues(valuesText);

    const parameterIndex = {
        value: 0
    };

    const document = {
        id: await nextId(table)
    };

    columns.forEach((column, index) => {

        document[column] =
            normalizeFieldValue(
                column,
                valueFromToken(
                    tokens[index],
                    params,
                    parameterIndex
                )
            );
    });

    await ensureReferences(table, document);

    // ------------------------------------------
    // Duplicate checking
    // ------------------------------------------

    const duplicateFields = {

        students: [
            "student_id",
            "email"
        ],

        courses: [
            "course_id"
        ],

        users: [
            "email"
        ],

        enrollments: [
            "student_id",
            "course_id"
        ],

        results: [
            "student_id",
            "course_id"
        ]

    }[table];

    if (
        duplicateFields &&
        await collection(table).findOne(
            Object.fromEntries(
                duplicateFields.map(
                    (field) => [
                        field,
                        document[field]
                    ]
                )
            )
        )
    ) {
        throw duplicateError();
    }

    if (table === "enrollments") {
        document.enrolled_at = new Date();
    }

    await collection(table)
        .insertOne(document);

    return {
        lastID: document.id,
        changes: 1
    };
}

// ======================================================
// UPDATE
// ======================================================

async function update(sql, params) {

    const query = normalize(sql);

    const match =
        query.match(
            /^UPDATE (\w+) SET (.+) WHERE id = \?$/i
        );

    // ------------------------------------------
    // Student login synchronization
    // ------------------------------------------

    if (!match) {

        if (
            /^UPDATE users SET name = \?, email = \? WHERE student_id = \? AND role = 'student'$/i
                .test(query)
        ) {

            const result =
                await collection("users")
                    .updateMany(
                        {
                            student_id: params[2],
                            role: "student"
                        },
                        {
                            $set: {
                                name: params[0],
                                email: params[1]
                            }
                        }
                    );

            return {
                changes: result.modifiedCount
            };
        }

        throw new Error(
            `Unsupported UPDATE query: ${sql}`
        );
    }

    const [
        ,
        table,
        assignments
    ] = match;

    const document = {};

    assignments
        .split(",")
        .forEach(
            (assignment, index) => {

                const field =
                    assignment
                        .split("=")[0]
                        .trim();

                document[field] =
                    normalizeFieldValue(
                        field,
                        params[index]
                    );
            }
        );

    const id =
        normalizeId(
            params[params.length - 1]
        );

    await ensureReferences(table, document);

    // ------------------------------------------
    // Duplicate checking
    // ------------------------------------------

    const duplicateFields =
        table === "students"
            ? [
                "student_id",
                "email"
            ]
            : table === "courses"
                ? [
                    "course_id"
                ]
                : table === "results"
                    ? [
                        "student_id",
                        "course_id"
                    ]
                    : [];

    if (
        duplicateFields.length &&
        await collection(table).findOne({
            $and: [
                {
                    id: {
                        $ne: id
                    }
                },

                ...duplicateFields.map(
                    (field) => ({
                        [field]:
                            document[field]
                    })
                )
            ]
        })
    ) {
        throw duplicateError();
    }

    const result =
        await collection(table)
            .updateOne(
                { id },
                { $set: document }
            );

    return {
        changes: result.matchedCount
    };
}

// ======================================================
// DELETE
// ======================================================

async function remove(sql, params) {

    const match =
        normalize(sql).match(
            /^DELETE FROM (\w+) WHERE (.+)$/i
        );

    if (!match) {
        throw new Error(
            `Unsupported DELETE query: ${sql}`
        );
    }

    const [
        ,
        table,
        condition
    ] = match;

    const filter = {};

    let parameterIndex = 0;

    condition
        .split(/\s+AND\s+/i)
        .forEach((part) => {

            const conditionMatch =
                part.match(
                    /(\w+)\s*=\s*\?/i
                );

            if (conditionMatch) {

                const field =
                    conditionMatch[1];

                filter[field] =
                    normalizeFieldValue(
                        field,
                        params[parameterIndex++]
                    );
            }
        });

    const result =
        await collection(table)
            .deleteMany(filter);

    return {
        changes:
            result.deletedCount
    };
}

// ======================================================
// RUN QUERY
// ======================================================

async function runQuery(
    sql,
    params = []
) {

    const query = normalize(sql);

    if (/^INSERT INTO/i.test(query)) {
        return insert(sql, params);
    }

    if (/^UPDATE/i.test(query)) {
        return update(sql, params);
    }

    if (/^DELETE FROM/i.test(query)) {
        return remove(sql, params);
    }

    throw new Error(
        `Unsupported database operation: ${sql}`
    );
}

// ======================================================
// GET QUERY
// ======================================================

async function getQuery(
    sql,
    params = []
) {

    const query = normalize(sql);

    let filter;
    let table;

    if (
        /FROM students WHERE student_id = \? OR email = \?/i
            .test(query)
    ) {

        table = "students";

        filter = {
            $or: [
                {
                    student_id:
                        normalizeId(params[0])
                },
                {
                    email: params[1]
                }
            ]
        };
    }

    else if (
        /FROM students WHERE \(student_id = \? OR email = \?\) AND id != \?/i
            .test(query)
    ) {

        table = "students";

        filter = {
            $and: [
                {
                    $or: [
                        {
                            student_id:
                                normalizeId(params[0])
                        },
                        {
                            email: params[1]
                        }
                    ]
                },
                {
                    id: {
                        $ne:
                            normalizeId(params[2])
                    }
                }
            ]
        };
    }

    else if (
        /FROM users WHERE email = \? AND NOT/i
            .test(query)
    ) {

        table = "users";

        filter = {
            email: params[0],

            $or: [
                {
                    role: {
                        $ne: "student"
                    }
                },
                {
                    student_id: {
                        $ne:
                            normalizeId(params[1])
                    }
                }
            ]
        };
    }

    else if (
        /FROM courses WHERE course_id = \? AND id != \?/i
            .test(query)
    ) {

        table = "courses";

        filter = {
            course_id: params[0],

            id: {
                $ne:
                    normalizeId(params[1])
            }
        };
    }

    else if (
        /FROM users WHERE email = \?/i
            .test(query)
    ) {

        table = "users";

        filter = {
            email: params[0]
        };
    }

    else {

        throw new Error(
            `Unsupported SELECT query: ${sql}`
        );
    }

    return collection(table)
        .findOne(
            filter,
            {
                projection: {
                    _id: 0
                }
            }
        );
}

// ======================================================
// JOINED ROWS
// ======================================================

async function joinedRows(
    type,
    studentId
) {

    const students =
        collection("students");

    const courses =
        collection("courses");

    // ------------------------------------------
    // Missing student accounts
    // ------------------------------------------

    if (type === "missing-students") {

        const [
            allStudents,
            users
        ] = await Promise.all([

            students
                .find(
                    {},
                    {
                        projection: {
                            _id: 0
                        }
                    }
                )
                .toArray(),

            collection("users")
                .find(
                    {
                        student_id: {
                            $exists: true
                        }
                    },
                    {
                        projection: {
                            student_id: 1
                        }
                    }
                )
                .toArray()
        ]);

        const linkedIds =
            new Set(
                users.map(
                    (user) =>
                        user.student_id
                )
            );

        return allStudents.filter(
            (student) =>
                !linkedIds.has(student.id)
        );
    }

    // ------------------------------------------
    // Enrollments / My Courses
    // ------------------------------------------

    if (
        type === "enrollments" ||
        type === "my-courses"
    ) {

        const filter =
            studentId === undefined
                ? {}
                : {
                    student_id:
                        studentId
                };

        const rows = [];

        const enrollments =
            await collection("enrollments")
                .find(
                    filter,
                    {
                        projection: {
                            _id: 0
                        }
                    }
                )
                .toArray();

        for (
            const enrollment
            of enrollments
        ) {

            const [
                student,
                course
            ] = await Promise.all([

                students.findOne(
                    {
                        id:
                            enrollment.student_id
                    },
                    {
                        projection: {
                            _id: 0
                        }
                    }
                ),

                courses.findOne(
                    {
                        id:
                            enrollment.course_id
                    },
                    {
                        projection: {
                            _id: 0
                        }
                    }
                )
            ]);

            if (
                !course ||
                (
                    type === "enrollments" &&
                    !student
                )
            ) {
                continue;
            }

            rows.push(

                type === "my-courses"

                    ? {

                        id: course.id,

                        course_id:
                            course.course_id,

                        name:
                            course.name,

                        duration:
                            course.duration,

                        fee:
                            course.fee,

                        enrollment_id:
                            enrollment.id
                    }

                    : {

                        id:
                            enrollment.id,

                        student_db_id:
                            student.id,

                        student_id:
                            student.student_id,

                        student_name:
                            student.name,

                        course_db_id:
                            course.id,

                        course_id:
                            course.course_id,

                        course_name:
                            course.name,

                        duration:
                            course.duration,

                        fee:
                            course.fee
                    }
            );
        }

        return rows.sort(
            (left, right) =>
                type === "my-courses"

                    ? left.name.localeCompare(
                        right.name
                    )

                    : right.id - left.id
        );
    }

    // ------------------------------------------
    // Results
    // ------------------------------------------

    const results =
        await collection("results")
            .find(
                studentId === undefined
                    ? {}
                    : {
                        student_id:
                            studentId
                    },
                {
                    projection: {
                        _id: 0
                    }
                }
            )
            .toArray();

    const rows = [];

    for (
        const result
        of results
    ) {

        const [
            student,
            course
        ] = await Promise.all([

            students.findOne({
                id:
                    result.student_id
            }),

            courses.findOne({
                id:
                    result.course_id
            })
        ]);

        if (
            student &&
            course
        ) {

            rows.push({

                id:
                    result.id,

                student_id:
                    student.student_id,

                student_name:
                    student.name,

                course_id:
                    course.course_id,

                course_name:
                    course.name,

                marks:
                    result.marks,

                grade:
                    result.grade
            });
        }
    }

    return rows.sort(
        (left, right) =>
            right.id - left.id
    );
}

// ======================================================
// ALL QUERY
// ======================================================

async function allQuery(
    sql,
    params = []
) {

    const query = normalize(sql);

    if (
        /FROM students s LEFT JOIN users/i
            .test(query)
    ) {

        return joinedRows(
            "missing-students"
        );
    }

    if (
        /FROM enrollments e INNER JOIN students/i
            .test(query)
    ) {

        return joinedRows(
            "enrollments"
        );
    }

    if (
        /FROM enrollments e INNER JOIN courses/i
            .test(query)
    ) {

        return joinedRows(
            "my-courses",
            normalizeId(params[0])
        );
    }

    if (
        /FROM results r INNER JOIN students/i
            .test(query)
    ) {

        return joinedRows(
            "results",
            normalizeId(params[0])
        );
    }

    const table =
        query.match(
            /FROM (students|courses)/i
        )?.[1];

    if (table) {

        return collection(table)
            .find(
                {},
                {
                    projection: {
                        _id: 0
                    }
                }
            )
            .sort({
                id: -1
            })
            .toArray();
    }

    throw new Error(
        `Unsupported SELECT query: ${sql}`
    );
}

// ======================================================
// CALLBACK OPERATION
// ======================================================

function callbackOperation(
    operation,
    args
) {

    const callback =
        args[args.length - 1];

    operation(
        ...args.slice(0, -1)
    )
        .then(
            (result) =>
                callback.call(
                    result || {},
                    null,
                    result
                )
        )
        .catch(
            (error) =>
                callback.call(
                    {},
                    error
                )
        );
}

// ======================================================
// INITIALIZE MONGODB
// ======================================================

async function initialize() {

    console.log(
        "Connecting to MongoDB..."
    );

    await mongoose.connect(
        databaseUrl,
        {
            dbName: databaseName
        }
    );

    database =
        mongoose.connection.db;

    await Promise.all([

        collection("students")
            .createIndex(
                {
                    student_id: 1
                },
                {
                    unique: true
                }
            ),

        collection("students")
            .createIndex(
                {
                    email: 1
                },
                {
                    unique: true
                }
            ),

        collection("courses")
            .createIndex(
                {
                    course_id: 1
                },
                {
                    unique: true
                }
            ),

        collection("users")
            .createIndex(
                {
                    email: 1
                },
                {
                    unique: true
                }
            ),

        collection("enrollments")
            .createIndex(
                {
                    student_id: 1,
                    course_id: 1
                },
                {
                    unique: true
                }
            ),

        collection("results")
            .createIndex(
                {
                    student_id: 1,
                    course_id: 1
                },
                {
                    unique: true
                }
            )
    ]);

    console.log(
        `MongoDB database "${databaseName}" is ready`
    );
}

// ======================================================
// DATABASE READY
// ======================================================

const ready =
    initialize()
        .catch((error) => {

            console.error(
                "MongoDB initialization failed:",
                error.message
            );

            throw error;
        });

// ======================================================
// WAIT FOR DATABASE
// ======================================================

function waitForDatabase(
    operation
) {

    return (...args) =>
        ready
            .then(
                () =>
                    callbackOperation(
                        operation,
                        args
                    )
            )
            .catch(
                (error) =>
                    args[
                        args.length - 1
                    ](
                        error
                    )
            );
}

// ======================================================
// EXPORT
// ======================================================

module.exports = {

    run:
        waitForDatabase(runQuery),

    get:
        waitForDatabase(getQuery),

    all:
        waitForDatabase(allQuery),

    serialize(callback) {
        callback();
    },

    ready
};