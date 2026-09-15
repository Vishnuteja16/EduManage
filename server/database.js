const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to connect to Supabase PostgreSQL");
}

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
        rejectUnauthorized: false
    }
});

function toPostgresQuery(sql, params = []) {
    let parameterIndex = 0;

    const text = sql.replace(/\?/g, () => `$${++parameterIndex}`);

    return {
        text,
        values: params
    };
}

function run(sql, params, callback) {
    const query = toPostgresQuery(sql, params);
    const isInsert = /^\s*INSERT\s+INTO\s+/i.test(query.text);
    const insertQuery =
        isInsert && !/\bRETURNING\b/i.test(query.text)
            ? `${query.text} RETURNING id`
            : query.text;

    pool.query(insertQuery, query.values, (err, result) => {
        if (err) {
            callback(err);
            return;
        }

        callback.call(
            {
                lastID: result.rows[0]?.id,
                changes: result.rowCount
            },
            null
        );
    });
}

function get(sql, params, callback) {
    const query = toPostgresQuery(sql, params);

    pool.query(query, (err, result) => {
        callback(err, result?.rows[0]);
    });
}

function all(sql, params, callback) {
    const query = toPostgresQuery(sql, params);

    pool.query(query, (err, result) => {
        callback(err, result?.rows || []);
    });
}

function serialize(callback) {
    callback();
}

async function initialize() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS students (
            id SERIAL PRIMARY KEY,
            student_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS courses (
            id SERIAL PRIMARY KEY,
            course_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            duration TEXT,
            fee NUMERIC
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS enrollments (
            id SERIAL PRIMARY KEY,
            student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_id, course_id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS results (
            id SERIAL PRIMARY KEY,
            student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            marks INTEGER NOT NULL,
            grade TEXT NOT NULL,
            UNIQUE(student_id, course_id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'student')),
            student_id INTEGER REFERENCES students(id) ON DELETE CASCADE
        )
    `);

    console.log("Supabase PostgreSQL tables are ready");
}

const ready = initialize().catch((error) => {
    console.error("Database initialization failed:", error.message);
    throw error;
});

function waitForDatabase(operation) {
    return (...args) => {
        ready.then(() => operation(...args)).catch((error) => {
            const callback = args[args.length - 1];
            callback(error);
        });
    };
}

module.exports = {
    run: waitForDatabase(run),
    get: waitForDatabase(get),
    all: waitForDatabase(all),
    serialize,
    ready
};