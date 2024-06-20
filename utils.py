import os
import subprocess
import uuid
import logging
from PIL import Image
from music21 import converter

logging.basicConfig(level=logging.DEBUG)

OUTPUT_DIR = 'output'
os.makedirs(OUTPUT_DIR, exist_ok=True)

AUDIVERIS_PATH = '/Users/hguan/Documents/GitHub/audiveris/app/build/install/app/bin/Audiveris'

MAX_PIXELS = 20000000
DPI = 450

def cleanup_files():
    try:
        for filename in os.listdir(OUTPUT_DIR):
            file_path = os.path.join(OUTPUT_DIR, filename)
            if not filename.endswith('.mxl') and not filename.endswith('.mid') and os.path.isfile(file_path):
                os.remove(file_path)
                logging.debug(f'Deleted file: {file_path}')
    except Exception as e:
        logging.error(f'Error cleaning up files: {e}')

def convert_heic_to_png(heic_path, png_path):
    try:
        image = Image.open(heic_path)
        image.save(png_path, 'png')
        logging.debug(f'Converted HEIC to PNG: {png_path}')
    except Exception as e:
        logging.error(f'Error converting HEIC to PNG: {str(e)}')
        raise

def transcribe_file(filepath):
    file_ext = filepath.split('.')[-1].lower()

    if file_ext == 'heic':
        png_filename = f"{uuid.uuid4()}.png"
        png_filepath = os.path.join(OUTPUT_DIR, png_filename)
        convert_heic_to_png(filepath, png_filepath)
        filepath = png_filepath

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
            return

        logging.debug(f'Audiveris output: {stdout.decode("utf-8")}')
        logging.debug(f'Audiveris errors: {stderr.decode("utf-8")}')
        
        if process.returncode != 0:
            raise subprocess.CalledProcessError(process.returncode, command, output=stdout, stderr=stderr)

        logging.debug(f'Contents of output directory after running Audiveris: {os.listdir(OUTPUT_DIR)}')

        omr_files = [f for f in os.listdir(OUTPUT_DIR) if f.endswith('.omr')]
        if not omr_files:
            logging.error("No OMR file generated")
            return

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
            cleanup_files()
            return
        except subprocess.CalledProcessError as e:
            logging.error(f'Export command failed: {e.stderr.decode("utf-8")}')
            return

        logging.debug(f'Contents of output directory after exporting: {os.listdir(OUTPUT_DIR)}')

        if not os.path.exists(mxl_filepath):
            logging.error('No MusicXML file generated')
            return

        logging.info("Processing complete")

        # Generate MIDI file from MusicXML (.mxl)
        try:
            midi_stream = converter.parse(mxl_filepath)
            midi_filename = f"{uuid.uuid4()}.mid"
            midi_filepath = os.path.join(OUTPUT_DIR, midi_filename)
            midi_stream.write('midi', midi_filepath)
            logging.info(f'MIDI file generated: {midi_filepath}')
        except Exception as e:
            logging.error(f'Error generating MIDI file: {e}')

    except subprocess.CalledProcessError as e:
        logging.error(f'Processing failed: {e.stderr.decode("utf-8")}')
    finally:
        try:
            if process.poll() is None:
                process.terminate()
                process.wait()
                logging.debug('Audiveris process terminated')
        except Exception as e:
            logging.error(f'Failed to terminate process: {e}')

# Example usage:
# transcribe_file('/path/to/your/file')
