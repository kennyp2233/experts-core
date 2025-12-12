const express = require('express');
const ADODB = require('node-adodb');
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

// Conexión con ADODB (usa OLE DB nativo de Windows, sin compilación)
const connectionString = `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${dbPath};Jet OLEDB:Database Password=${dbPassword};`;
const connection = ADODB.open(connectionString);

console.log(`✅ Connected to Access DB at: ${dbPath}`);

app.post('/query', async (req, res) => {
    const { sql } = req.body;
    if (!sql) {
        return res.status(400).json({ error: 'SQL query is required' });
    }
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
    res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Legacy Bridge Server running on http://0.0.0.0:${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`Network access: http://192.168.0.100:${PORT}`);
    console.log('Ready to accept queries from Docker container.');
});