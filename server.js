const express = require('express');
const { Pool } = require('pg');
const app = express();

// Configure logging
const logger = {
    info: (msg) => console.log(msg),
    error: (msg) => console.error(msg)
};

// Set DATABASE_URL directly
const DATABASE_URL = "postgresql://postgres.mzrojtkzrlnkorthbwtc:WQOLNsCLxomn9uCN@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";

// Set up PostgreSQL connection pool
const pool = new Pool({
    connectionString: DATABASE_URL
});

logger.info(`Using database URL: ${DATABASE_URL}`);

// LastFightRetriever equivalent
class LastFightRetriever {
    static async getLastFight(chatId) {
        try {
            const query = `
        SELECT *
        FROM fights
        WHERE chactacter_id = (
            SELECT id 
            FROM personajes
            WHERE chat_id = $1
            ORDER BY id DESC
            LIMIT 1
        )
        ORDER BY id DESC
        LIMIT 1;
      `;

            const result = await pool.query(query, [chatId]);
            if (result.rows.length > 0) {
                return result.rows[0];
            }
            return null;
        } catch (e) {
            logger.error(`Database error: ${e.message}`);
            throw e;
        }
    }
}

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Last fight endpoint
app.get('/last-fight', async (req, res) => {
    try {
        const chatId = req.query.chat_id;
        if (!chatId) {
            return res.status(400).json({ error: 'Chat ID is required' });
        }

        const lastFight = await LastFightRetriever.getLastFight(chatId);

        if (lastFight) {
            return res.status(200).json(lastFight);
        } else {
            return res.status(404).json({ message: 'No fight found' });
        }
    } catch (e) {
        logger.error(`Error in get_last_fight endpoint: ${e.message}`);
        return res.status(500).json({ error: `Server error: ${e.message}` });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', async () => {
    logger.info(`Server running on port ${PORT}`);

    // Verify PostgreSQL database connection
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT version()');
        logger.info(`PostgreSQL database connection successful: ${result.rows[0].version}`);
        client.release();
    } catch (e) {
        logger.error(`Failed to connect to PostgreSQL database: ${e.message}`);
    }
});
