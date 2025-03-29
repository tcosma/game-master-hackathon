const express = require('express');
const { Pool } = require('pg');
const app = express();

// Configure logging
const logger = {
    info: (msg) => console.log(msg),
    error: (msg) => console.error(msg)
};

const DATABASE_URL = "postgresql://postgres.mzrojtkzrlnkorthbwtc:WQOLNsCLxomn9uCN@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";

const pool = new Pool({
    connectionString: DATABASE_URL
});

logger.info(`Using database URL: ${DATABASE_URL}`);

// Add JSON body parsing middleware
app.use(express.json());

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

// CharacterRetriever to get all characters by chat_id
class CharacterRetriever {
    static async getCharactersByChatId(chatId) {
        try {
            const query = `
        SELECT id, nombre, puntos_de_vida
        FROM personajes
        WHERE chat_id = $1
        ORDER BY id DESC;
      `;

            const result = await pool.query(query, [chatId]);
            return result.rows;
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

// Update fight endpoint
app.put('/update-fight', async (req, res) => {
    try {
        const fightId = req.query.id;
        if (!fightId) {
            return res.status(400).json({ error: 'Fight ID is required as a query parameter' });
        }

        const updateData = req.body;
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No update data provided' });
        }

        // Build dynamic SET clause for SQL update
        const validFields = [
            'initiative_roll', 'player_action', 'player_attack_roll',
            'enemy_armor_defense', 'damage_roll', 'damage_dealt',
            'enemy_moral_roll', 'enemy_moral_check', 'fight_state'
        ];

        const setItems = [];
        const values = [];
        let paramIndex = 1;

        validFields.forEach(field => {
            if (updateData[field] !== undefined) {
                setItems.push(`${field} = $${paramIndex}`);
                values.push(updateData[field]);
                paramIndex++;
            }
        });

        if (setItems.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        // Add the fight ID as the last parameter
        values.push(fightId);

        const updateQuery = `
            UPDATE fights
            SET ${setItems.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *;
        `;

        const result = await pool.query(updateQuery, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Fight not found' });
        }

        // Also update the timestamp in the sessions table
        const sessionsUpdateQuery = `
            UPDATE sessions 
            SET updated_at = NOW()
            WHERE last_fight_id = $1
        `;

        await pool.query(sessionsUpdateQuery, [fightId]);

        return res.status(200).json({
            message: 'Fight updated successfully',
            fight: result.rows[0]
        });
    } catch (e) {
        logger.error(`Error in update fight endpoint: ${e.message}`);
        return res.status(500).json({ error: `Server error: ${e.message}` });
    }
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

// Characters endpoint
app.get('/characters', async (req, res) => {
    try {
        const chatId = req.query.chat_id;
        if (!chatId) {
            return res.status(400).json({ error: 'Chat ID is required' });
        }

        const characters = await CharacterRetriever.getCharactersByChatId(chatId);

        if (characters.length > 0) {
            return res.status(200).json(characters);
        } else {
            return res.status(404).json({ message: 'No characters found for this chat ID' });
        }
    } catch (e) {
        logger.error(`Error in characters endpoint: ${e.message}`);
        return res.status(500).json({ error: `Server error: ${e.message}` });
    }
});

// Delete character endpoint
app.delete('/character', async (req, res) => {
    try {
        const characterId = req.query.character_id;
        const chatId = req.query.chat_id;

        if (!characterId || !chatId) {
            return res.status(400).json({ error: 'Character ID and Chat ID are required' });
        }

        // First, verify the character belongs to the specified chat
        const verifyQuery = `
            SELECT id FROM personajes 
            WHERE id = $1 AND chat_id = $2
        `;

        const verifyResult = await pool.query(verifyQuery, [characterId, chatId]);

        if (verifyResult.rows.length === 0) {
            return res.status(403).json({ error: 'Character does not belong to this chat or does not exist' });
        }

        // If verification passes, delete the character
        const deleteQuery = `
            DELETE FROM personajes 
            WHERE id = $1
        `;

        await pool.query(deleteQuery, [characterId]);

        return res.status(200).json({ message: 'Character deleted successfully' });
    } catch (e) {
        logger.error(`Error in delete character endpoint: ${e.message}`);
        return res.status(500).json({ error: `Server error: ${e.message}` });
    }
});

// Delete all characters for a chat ID endpoint
app.delete('/characters', async (req, res) => {
    try {
        const chatId = req.query.chat_id;

        if (!chatId) {
            return res.status(400).json({ error: 'Chat ID is required' });
        }

        // Delete all characters for the given chat ID
        const deleteQuery = `
            DELETE FROM personajes 
            WHERE chat_id = $1
            RETURNING id
        `;

        const result = await pool.query(deleteQuery, [chatId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'No characters found for this chat ID' });
        }

        return res.status(200).json({
            message: 'All characters deleted successfully',
            count: result.rowCount
        });
    } catch (e) {
        logger.error(`Error in delete all characters endpoint: ${e.message}`);
        return res.status(500).json({ error: `Server error: ${e.message}` });
    }
});

// Create character endpoint
app.post('/character', async (req, res) => {
    try {
        const { nombre, chat_id } = req.body;

        // Validate required fields
        if (!nombre || !chat_id) {
            return res.status(400).json({ error: 'Both name (nombre) and chat_id are required' });
        }

        // Check if the character limit has been reached
        const countQuery = `
            SELECT COUNT(*) FROM personajes
            WHERE chat_id = $1
        `;

        const countResult = await pool.query(countQuery, [chat_id]);
        const characterCount = parseInt(countResult.rows[0].count);

        if (characterCount >= 10) {
            return res.status(403).json({
                error: 'Character limit reached. Maximum 10 characters allowed per chat.'
            });
        }

        // Check if character with same name already exists for this chat_id
        const checkQuery = `
            SELECT id FROM personajes
            WHERE nombre = $1 AND chat_id = $2
        `;

        const checkResult = await pool.query(checkQuery, [nombre, chat_id]);

        if (checkResult.rows.length > 0) {
            return res.status(409).json({
                error: 'A character with this name already exists for this chat',
                existingCharacterId: checkResult.rows[0].id
            });
        }

        // Insert the new character
        const query = `
            INSERT INTO personajes (nombre, chat_id)
            VALUES ($1, $2)
            RETURNING *;
        `;

        const result = await pool.query(query, [nombre, chat_id]);

        return res.status(201).json({
            message: 'Character created successfully',
            character: result.rows[0]
        });
    } catch (e) {
        logger.error(`Error in create character endpoint: ${e.message}`);
        return res.status(500).json({ error: `Server error: ${e.message}` });
    }
});

// Create fight endpoint
app.post('/create-fight', async (req, res) => {
    try {
        const {
            chat_id,
            personaje_id,
            monstruo_id,
            enemy_armor_defense,
            enemy_moral_roll,
            enemy_moral_check
        } = req.body;

        // Validate required fields
        if (!chat_id || !personaje_id || !monstruo_id) {
            return res.status(400).json({ error: 'chat_id, personaje_id, and monstruo_id are required' });
        }

        // Check if character exists and belongs to the chat
        const characterQuery = `
            SELECT * FROM personajes
            WHERE id = $1 AND chat_id = $2
        `;
        const characterResult = await pool.query(characterQuery, [personaje_id, chat_id]);

        if (characterResult.rows.length === 0) {
            return res.status(404).json({ error: 'Character not found or does not belong to this chat' });
        }

        // Create the fight with only the provided fields
        const createFightQuery = `
            INSERT INTO fights (
                personaje_id, 
                monstruo_id, 
                enemy_armor_defense,
                enemy_moral_roll,
                enemy_moral_check,
                fight_state
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;

        const fightValues = [
            personaje_id,
            monstruo_id,
            enemy_armor_defense || null,
            enemy_moral_roll || null,
            enemy_moral_check || null,
            'in_progress' // default fight_state value
        ];

        const fightResult = await pool.query(createFightQuery, fightValues);
        const newFight = fightResult.rows[0];

        // Check if a session exists with this active_character_id
        const sessionQuery = `
            SELECT * FROM sessions
            WHERE active_character_id = $1
        `;
        const sessionResult = await pool.query(sessionQuery, [personaje_id]);

        let sessionResponse;

        if (sessionResult.rows.length > 0) {
            // Update existing session
            const updateSessionQuery = `
                UPDATE sessions
                SET last_fight_id = $1, updated_at = NOW()
                WHERE active_character_id = $2
                RETURNING *;
            `;
            const updateResult = await pool.query(updateSessionQuery, [newFight.id, personaje_id]);
            sessionResponse = updateResult.rows[0];
        } else {
            // Create new session
            const createSessionQuery = `
                INSERT INTO sessions (active_character_id, last_fight_id, chat_id, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
                RETURNING *;
            `;
            const createResult = await pool.query(createSessionQuery, [personaje_id, newFight.id, chat_id]);
            sessionResponse = createResult.rows[0];
        }

        return res.status(201).json({
            message: 'Fight created successfully',
            fight: newFight,
            session: sessionResponse
        });
    } catch (e) {
        logger.error(`Error in create fight endpoint: ${e.message}`);
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
