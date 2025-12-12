const express = require('express');
const odbc = require('odbc');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(bodyParser.json());

const dbPath = process.env.LEGACY_DB_PATH;
const dbPassword = process.env.LEGACY_DB_PASSWORD || '';

if (!dbPath) {
    console.error('ERROR: LEGACY_DB_PATH is not set in .env file');
    process.exit(1);
}

const connectionString = `Driver={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=${dbPath};PWD=${dbPassword};`;

let connection;

async function connectToDb() {
    try {
        console.log(`Connecting to Access DB at: ${dbPath}`);
        connection = await odbc.connect(connectionString);
        console.log('Successfully connected to Access Database.');
    } catch (error) {
        console.error('Failed to connect to Access Database:', error);
        process.exit(1);
    }
}

connectToDb();

app.post('/query', async (req, res) => {
    const { sql } = req.body;

    if (!sql) {
        return res.status(400).json({ error: 'SQL query is required' });
    }

    // Basic logging
    console.log(`[QUERY] ${sql}`);

    try {
        const result = await connection.query(sql);
        res.json(result);
    } catch (error) {
        console.error(`[ERROR] ${error.message}`);
        res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', connected: !!connection });
});

app.listen(PORT, () => {
    console.log(`Legacy Bridge Server running on http://localhost:${PORT}`);
    console.log('Ready to accept queries from Docker container.');
});
