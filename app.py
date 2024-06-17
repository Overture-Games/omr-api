# app.py

from flask import Flask, request, jsonify
from concurrent.futures import ThreadPoolExecutor
import logging
import time
import os
import uuid  # Make sure to import uuid
from utils import transcribe_file, OUTPUT_DIR  # Import functions from utils.py

app = Flask(__name__)

executor = ThreadPoolExecutor(max_workers=4)  # Adjust number of workers as needed

# Configure logging
logging.basicConfig(level=logging.DEBUG)

@app.route('/')
def home():
    return 'Audiveris API is running. Use the /process endpoint to upload and process PDF files.'

@app.route('/process', methods=['POST'])
def process_image():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    file_ext = file.filename.split('.')[-1].lower()
    unique_filename = f"{uuid.uuid4()}.{file_ext}"  # Using uuid to generate a unique filename
    original_filepath = os.path.join(OUTPUT_DIR, unique_filename)
    logging.debug(f'Saving uploaded file to: {original_filepath}')
    file.save(original_filepath)
    logging.debug(f'File saved successfully: {original_filepath}')

    future = executor.submit(transcribe_file, original_filepath)
    result = future.result()
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
