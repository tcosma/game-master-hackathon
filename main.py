from flask import Flask, request, jsonify
import os
from supabase import create_client, Client

app = Flask(__name__)


# Configuración de Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/get_last_fight', methods=['POST'])
def get_last_fight():
    data = request.json
    chat_id = data.get('chat_id')

    if not chat_id:
        return jsonify({'error': 'chat_id is required'}), 400

    try:
        # Obtener el último personaje del chat_id dado
        last_character_response = supabase.table('personajes') \
            .select('id') \
            .eq('chat_id', chat_id) \
            .order('id', desc=True) \
            .limit(1) \
            .execute()

        if not last_character_response.data:
            return jsonify({'message': 'No character found for the given chat_id'}), 404

        last_character_id = last_character_response.data[0]['id']

        # Obtener la última pelea asociada al personaje
        last_fight_response = supabase.table('fights') \
            .select('*') \
            .eq('character_id', last_character_id) \
            .order('id', desc=True) \
            .limit(1) \
            .execute()

        if last_fight_response.data:
            return jsonify(last_fight_response.data[0]), 200
        else:
            return jsonify({'message': 'No fights found for the given character'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)