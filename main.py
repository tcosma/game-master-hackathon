from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Set DATABASE_URL directly
DATABASE_URL = "postgresql://postgres.mzrojtkzrlnkorthbwtc:WQOLNsCLxomn9uCN@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

logger.info(f"Using database URL: {DATABASE_URL}")

db = SQLAlchemy(app)


class LastFightRetriever:
    @staticmethod
    def get_last_fight(chat_id):
        """
        Recupera la última pelea para un personaje específico en un chat
        """
        try:
            query = text(
                """
            SELECT *
            FROM fights
            WHERE chactacter_id = (
                SELECT id 
                FROM personajes
                WHERE chat_id = :chat_id
                ORDER BY id DESC
                LIMIT 1
            )
            ORDER BY id DESC
            LIMIT 1;

            """
            )

            result = db.session.execute(query, {"chat_id": chat_id}).fetchone()
            if result:
                # More robust way to convert SQLAlchemy result to dictionary
                return (
                    dict(result._mapping)
                    if hasattr(result, "_mapping")
                    else dict(result)
                )
            return None
        except Exception as e:
            logger.error(f"Database error: {str(e)}")
            raise


@app.route("/last-fight", methods=["GET"])
def get_last_fight():
    try:
        chat_id = request.args.get("chat_id")
        if not chat_id:
            return jsonify({"error": "Chat ID is required"}), 400

        last_fight = LastFightRetriever.get_last_fight(chat_id)

        if last_fight:
            return jsonify(last_fight), 200
        else:
            return jsonify({"message": "No fight found"}), 404
    except Exception as e:
        logger.error(f"Error in get_last_fight endpoint: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Server is running"}), 200


if __name__ == "__main__":
    try:
        # Verify PostgreSQL database connection
        with app.app_context():
            result = db.session.execute(text("SELECT version()")).fetchone()
            logger.info(f"PostgreSQL database connection successful: {result[0]}")
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL database: {str(e)}")
        logger.error(
            "Make sure you have installed psycopg2: pip install psycopg2-binary"
        )

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
