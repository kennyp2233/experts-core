const express = require('express');
const ADODB = require('node-adodb');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3006;

const dbPath = process.env.LEGACY_DB_PATH;
const dbPassword = process.env.LEGACY_DB_PASSWORD || '';
const bridgeToken = process.env.LEGACY_BRIDGE_TOKEN;
const writesEnabled = process.env.LEGACY_WRITES_ENABLED === 'true';

if (!dbPath) {
    console.error('ERROR: LEGACY_DB_PATH is not set');
    process.exit(1);
}
if (!bridgeToken) {
    console.error('ERROR: LEGACY_BRIDGE_TOKEN is not set. Bridge refuses to start without auth.');
    process.exit(1);
}

const connectionString = `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${dbPath};Jet OLEDB:Database Password=${dbPassword};`;
const connection = ADODB.open(connectionString);

app.use(cors());
app.use(bodyParser.json());

const WRITE_KEYWORDS = [
    'UPDATE', 'INSERT', 'DELETE', 'ALTER', 'DROP',
    'CREATE', 'TRUNCATE', 'REPLACE', 'MERGE', 'EXEC', 'EXECUTE',
];

function detectWriteOperation(sql) {
    let cleaned = String(sql).trim();
    while (true) {
        if (cleaned.startsWith('/*')) {
            const end = cleaned.indexOf('*/');
            if (end === -1) break;
            cleaned = cleaned.slice(end + 2).trim();
        } else if (cleaned.startsWith('--')) {
            const eol = cleaned.indexOf('\n');
            cleaned = eol === -1 ? '' : cleaned.slice(eol + 1).trim();
        } else {
            break;
        }
    }
    const firstWord = (cleaned.split(/\s+/)[0] || '').toUpperCase();
    return WRITE_KEYWORDS.includes(firstWord) ? firstWord : null;
}

function hasMultipleStatements(sql) {
    // Strip single-quoted literals (Access escapes with '') then look for ; followed by non-whitespace
    const withoutStrings = String(sql).replace(/'(?:[^']|'')*'/g, "''");
    return /;\s*\S/.test(withoutStrings);
}

function requireToken(req, res, next) {
    const token = req.header('X-Bridge-Token');
    if (!token || token !== bridgeToken) {
        return res.status(401).json({ error: 'Invalid or missing X-Bridge-Token header.' });
    }
    next();
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok', writesEnabled });
});

app.post('/query', requireToken, async (req, res) => {
    const { sql, allowWrite, reason } = req.body || {};
    if (!sql || typeof sql !== 'string') {
        return res.status(400).json({ error: 'SQL query (string) is required.' });
    }

    if (hasMultipleStatements(sql)) {
        console.warn(`[BLOCKED-MULTI] sql=${sql}`);
        return res.status(403).json({ error: 'Multi-statement SQL is not allowed.' });
    }

    const writeOp = detectWriteOperation(sql);
    const isWrite = writeOp !== null;

    if (isWrite) {
        if (!writesEnabled) {
            console.warn(`[BLOCKED-WRITE] ${writeOp} attempted; writes globally disabled. sql=${sql}`);
            return res.status(403).json({ error: 'Writes are disabled on this bridge. Set LEGACY_WRITES_ENABLED=true and restart.' });
        }
        if (allowWrite !== true) {
            console.warn(`[BLOCKED-WRITE] ${writeOp} without allowWrite=true. sql=${sql}`);
            return res.status(403).json({ error: `Write operation (${writeOp}) requires allowWrite:true.` });
        }
        if (typeof reason !== 'string' || reason.trim().length < 5) {
            return res.status(400).json({ error: 'Write operations require a "reason" string (min 5 chars).' });
        }
        console.warn(`[AUTHORIZED-WRITE] op=${writeOp} reason="${reason}" sql=${sql}`);
    } else {
        if (allowWrite === true) {
            return res.status(400).json({ error: 'allowWrite=true sent with non-mutating SQL.' });
        }
        console.log(`[QUERY] ${sql}`);
    }

    try {
        const result = isWrite
            ? await connection.execute(sql)
            : await connection.query(sql);
        res.json(result === undefined ? { ok: true } : result);
    } catch (error) {
        console.error(`[ERROR] ${error.message}`);
        res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Legacy Bridge listening on 0.0.0.0:${PORT}`);
    console.log(`DB path: ${dbPath}`);
    console.log(`Writes globally: ${writesEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`Token: required on POST /query (X-Bridge-Token header)`);
});
