require('dotenv').config(); // Carga variables desde archivo .env si existe

// Obtiene DATABASE_URL desde las variables de entorno
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('Error: DATABASE_URL no está definido en las variables de entorno');
    process.exit(1);
}

// Configuración de la conexión a la base de datos
const dbConfig = {
    connectionString: databaseUrl,
    // Puedes añadir más opciones de configuración aquí
};

module.exports = dbConfig;
