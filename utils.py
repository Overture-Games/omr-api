# utils.py

import time
import os
import subprocess
import uuid
import logging
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

# Define the directory where Audiveris will output files
OUTPUT_DIR = 'output'
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Path to the Audiveris executable (if not using PATH)
AUDIVERIS_PATH = '/Users/hguan/Documents/GitHub/audiveris/app/build/install/app/bin/Audiveris'

MAX_PIXELS = 20000000  # Maximum number of pixels (20 million)
DPI = 450  # Desired DPI for PDF conversion

def convert_png_to_pdf(png_path, pdf_path):
    image = Image.open(png_path)
    logging.debug(f'Original image size: {image.size[0]}x{image.size[1]}')

    # Resize image if the total number of pixels exceeds the maximum allowed
    if image.width * image.height > MAX_PIXELS or image.width > 10000 or image.height > 10000:
        aspect_ratio = image.width / image.height
        new_width = min(image.width, 10000)
        new_height = min(image.height, 10000)
        if aspect_ratio > 1:  # Width is greater than height
            new_width = 10000
            new_height = int(new_width / aspect_ratio)
        else:  # Height is greater than width
            new_height = 10000
            new_width = int(new_height * aspect_ratio)
        
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        logging.debug(f'Resized image size: {image.size[0]}x{image.size[1]}')

        # Save the resized image back to the same path
        resized_png_path = png_path.replace(".png", "_resized.png")
        image.save(resized_png_path)
        logging.debug(f'Resized image saved to: {resized_png_path}')
        png_path = resized_png_path

    # Convert to PDF with specified DPI
    pdf_width, pdf_height = image.size[0] / DPI * inch, image.size[1] / DPI * inch
    c = canvas.Canvas(pdf_path, pagesize=(pdf_width, pdf_height))
    c.drawImage(png_path, 0, 0, pdf_width, pdf_height)
    logging.debug(f'PDF created with size: {pdf_width}x{pdf_height} inches at {DPI} DPI')
    c.save()

def cleanup_files(output_dir, keep_file):
    for filename in os.listdir(output_dir):
        file_path = os.path.join(output_dir, filename)
        if file_path != keep_file and not file_path.endswith('.mxl'):
            try:
                os.remove(file_path)
                logging.debug(f'Deleted file: {file_path}')
            except Exception as e:
                logging.error(f'Error deleting file {file_path}: {e}')

def transcribe_file(filepath):
    file_ext = filepath.split('.')[-1].lower()

    if file_ext == 'png':
        pdf_filename = f"{uuid.uuid4()}.pdf"
        pdf_filepath = os.path.join(OUTPUT_DIR, pdf_filename)
        convert_png_to_pdf(filepath, pdf_filepath)
        filepath = pdf_filepath

    try:
        logging.debug(f'Contents of output directory before running Audiveris: {os.listdir(OUTPUT_DIR)}')

        command = [AUDIVERIS_PATH, '-batch', '-output', OUTPUT_DIR, filepath]
        logging.debug(f'Running Audiveris command: {" ".join(command)}')
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            stdout, stderr = process.communicate(timeout=600)
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()
            logging.error(f'Audiveris command timed out: {stderr.decode("utf-8")}')
            return {'error': 'Audiveris processing timed out'}

        logging.debug(f'Audiveris output: {stdout.decode("utf-8")}')
        logging.debug(f'Audiveris errors: {stderr.decode("utf-8")}')
        
        if process.returncode != 0:
            raise subprocess.CalledProcessError(process.returncode, command, output=stdout, stderr=stderr)

        logging.debug(f'Contents of output directory after running Audiveris: {os.listdir(OUTPUT_DIR)}')

        omr_files = [f for f in os.listdir(OUTPUT_DIR) if f.endswith('.omr')]
        if not omr_files:
            return {'error': 'No OMR file generated'}

        omr_filepath = os.path.join(OUTPUT_DIR, omr_files[0])
        mxl_filename = f"{uuid.uuid4()}.mxl"
        mxl_filepath = os.path.join(OUTPUT_DIR, mxl_filename)
        export_command = [AUDIVERIS_PATH, '-export', omr_filepath, '-output', mxl_filepath]
        
        try:
            logging.debug(f'Running export command: {" ".join(export_command)}')
            export_result = subprocess.run(export_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=20)
            logging.debug(f'Export output: {export_result.stdout.decode("utf-8")}')
            logging.debug(f'Export errors: {export_result.stderr.decode("utf-8")}')
        except subprocess.TimeoutExpired:
            logging.error('Export command timed out')
            cleanup_files(OUTPUT_DIR, mxl_filepath)
            return {'error': 'Export processing timed out'}
        except subprocess.CalledProcessError as e:
            logging.error(f'Export command failed: {e.stderr.decode("utf-8")}')
            return {'error': 'Export processing failed', 'details': e.stderr.decode('utf-8')}

        logging.debug(f'Contents of output directory after exporting: {os.listdir(OUTPUT_DIR)}')

        if not os.path.exists(mxl_filepath):
            logging.error('No MusicXML file generated')
            return {'error': 'No MusicXML file generated'}

        # cleanup_files(OUTPUT_DIR, mxl_filepath)

        return {'message': 'Processing complete', 'output_file': mxl_filepath}

    except subprocess.CalledProcessError as e:
        logging.error(f'Processing failed: {e.stderr.decode("utf-8")}')
        return {'error': 'Processing failed', 'details': e.stderr.decode('utf-8')}
    finally:
        try:
            if process.poll() is None:
                process.terminate()
                process.wait()
                logging.debug('Audiveris process terminated')
        except Exception as e:
            logging.error(f'Failed to terminate process: {e}')
