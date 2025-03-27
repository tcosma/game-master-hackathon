from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class LastFightRetriever:
    @staticmethod
    def get_last_fight(chat_id):
        """
        Recupera la última pelea para un personaje específico en un chat
        """
        query = text("""
            WITH LastCharacter AS (
                SELECT id 
                FROM personajes 
                WHERE chat_id = :chat_id 
                ORDER BY id DESC 
                LIMIT 1
            ) 
            SELECT f.* 
            FROM fights f 
            JOIN LastCharacter lc ON f.character_id = lc.id 
            ORDER BY f.id DESC 
            LIMIT 1
        """)
        
        result = db.engine.execute(query, {'chat_id': chat_id}).fetchone()
        return dict(result) if result else None

@app.route('/last-fight', methods=['GET'])
def get_last_fight():
    chat_id = request.args.get('chat_id')
    if not chat_id:
        return jsonify({"error": "Chat ID is required"}), 400
    
    last_fight = LastFightRetriever.get_last_fight(chat_id)
    
    if last_fight:
        return jsonify(last_fight), 200
    else:
        return jsonify({"message": "No fight found"}), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)