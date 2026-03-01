

from flask import Flask, jsonify, request
from flask_cors import CORS
from process_image import ProcessImage
from chat_bot import ChatBot
from exceptions import APIRateLimitException


app = Flask(__name__)

CORS(
    app,
    resources={
        r"/*": {
            "origins": [
                r"^https?://ai-recipe\.cloudrockers\.in(:\d+)?$"
            ]
        }
    },
)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}


def is_allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def hello_world():
    return 'Hello, World!'


@app.errorhandler(APIRateLimitException)
def handle_rate_limit_error(error: APIRateLimitException):
    return jsonify(error.to_response()), 429


@app.route('/upload-image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': "No file part found. Use form-data key 'image'."}), 400

    image_file = request.files['image']

    if image_file.filename == '':
        return jsonify({'error': 'No file selected.'}), 400

    if not is_allowed_file(image_file.filename):
        return jsonify({'error': 'Invalid file type. Only PNG and JPG are allowed.'}), 400

    process_image = ProcessImage(image_file)
    dishes_list = process_image.process()
    return jsonify({'message': dishes_list, 'filename': image_file.filename}), 200

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "")
    if not user_message:
        return jsonify({"error": "validation_error", "message": "'message' is required."}), 400

    # Here you would typically process the user_message and generate a response
    chat_bot = ChatBot()
    response_message = chat_bot.chat(user_message)
    return jsonify({"message": response_message})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)