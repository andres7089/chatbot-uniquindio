# scraper.py
from flask import Flask, jsonify
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

@app.route('/fechas', methods=['GET'])
def obtener_fechas():
    url = "https://www.uniquindio.edu.co/portal/fechas-academicas/"
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        fechas = [li.text.strip() for li in soup.find_all("li") if li.text.strip()]
        mensaje = "\n".join(fechas[:10]) if fechas else "No se encontraron fechas académicas."

        return jsonify({"mensaje": mensaje})
    except Exception as e:
        return jsonify({"mensaje": f"Error al obtener las fechas: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
