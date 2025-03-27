-- Crear función rpc para obtener la última pelea
CREATE
OR REPLACE FUNCTION get_last_fight(chat_id_param TEXT) RETURNS TABLE (
    id INT,
    character_id INT,
    enemy_id INT,
    result TEXT,
    damage_dealt INT,
    damage_received INT,
    xp_gained INT,
    created_at TIMESTAMPTZ
) LANGUAGE SQL AS $ $ WITH LastCharacter AS (
    SELECT
        id
    FROM
        personajes
    WHERE
        chat_id = chat_id_param
    ORDER BY
        id DESC
    LIMIT
        1
)
SELECT
    f.*
FROM
    fights f
    JOIN LastCharacter lc ON f.character_id = lc.id
ORDER BY
    f.id DESC
LIMIT
    1;

$ $;