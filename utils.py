import os
import subprocess
import logging
from PIL import Image
from music21 import converter
import sys

# Setup logging
logging.basicConfig(level=logging.DEBUG)

def cleanup_files(output_dir):
    """Cleanup files in the output directory except .mxl and .mid files."""
    try:
        for filename in os.listdir(output_dir):
            file_path = os.path.join(output_dir, filename)
            if not filename.endswith('.mxl') and not filename.endswith('.mid') and os.path.isfile(file_path):
                os.remove(file_path)
                logging.debug(f'Deleted file: {file_path}')
    except Exception as e:
        logging.error(f'Error cleaning up files: {e}')

def convert_heic_to_png(heic_path, png_path):
    """Convert HEIC image to PNG."""
    try:
        image = Image.open(heic_path)
        image.save(png_path, 'png')
        logging.debug(f'Converted HEIC to PNG: {png_path}')
    except Exception as e:
        logging.error(f'Error converting HEIC to PNG: {str(e)}')
        raise

def generate_midi_from_mxl(input_filepath, output_dir):
    """Generate MIDI file from MusicXML (.mxl) file."""
    try:
        base_filename = os.path.splitext(os.path.basename(input_filepath))[0]
        mxl_filepath = os.path.join(output_dir, f"{base_filename}.mxl")
        midi_filepath = os.path.join(output_dir, f"{base_filename}.mid")

        midi_stream = converter.parse(mxl_filepath)
        midi_stream.write('midi', midi_filepath)
        logging.info(f'MIDI file generated: {midi_filepath}')
    except Exception as e:
        logging.error(f'Error generating MIDI file: {e}')

def run_audiveris(input_filepath, output_dir):
    """Run Audiveris on the specified file."""
    AUDIVERIS_PATH = '/Users/hguan/Documents/GitHub/audiveris/app/build/install/app/bin/Audiveris'

    try:
        logging.debug(f'Contents of output directory before running Audiveris: {os.listdir(output_dir)}')

        # Handle HEIC conversion if needed
        file_ext = input_filepath.split('.')[-1].lower()
        if file_ext == 'heic':
            png_filename = f"{os.path.splitext(os.path.basename(input_filepath))[0]}.png"
            png_filepath = os.path.join(output_dir, png_filename)
            convert_heic_to_png(input_filepath, png_filepath)
            input_filepath = png_filepath

        # Run Audiveris command
        command = [AUDIVERIS_PATH, '-batch', '-output', output_dir, input_filepath]
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

        logging.debug(f'Contents of output directory after running Audiveris: {os.listdir(output_dir)}')

        # Check for generated OMR file
        omr_files = [f for f in os.listdir(output_dir) if f.endswith('.omr')]
        if not omr_files:
            logging.error("No OMR file generated")
            return

        omr_filepath = os.path.join(output_dir, omr_files[0])
        base_filename = os.path.splitext(os.path.basename(input_filepath))[0]
        mxl_filepath = os.path.join(output_dir, f"{base_filename}.mxl")
        export_command = [AUDIVERIS_PATH, '-export', omr_filepath, '-output', mxl_filepath]
        
        try:
            logging.debug(f'Running export command: {" ".join(export_command)}')
            export_result = subprocess.run(export_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=20)
            logging.debug(f'Export output: {export_result.stdout.decode("utf-8")}')
            logging.debug(f'Export errors: {export_result.stderr.decode("utf-8")}')
            
        except subprocess.TimeoutExpired:
            # Generate MIDI file from MusicXML (.mxl)
            generate_midi_from_mxl(input_filepath, output_dir)
            logging.error('Export command timed out')
            cleanup_files(output_dir)
            return
        except subprocess.CalledProcessError as e:
            logging.error(f'Export command failed: {e.stderr.decode("utf-8")}')
            return

        logging.debug(f'Contents of output directory after exporting: {os.listdir(output_dir)}')

        if not os.path.exists(mxl_filepath):
            logging.error('No MusicXML file generated')
            return

        logging.info("Processing complete")

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

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 utils.py <input_file_path> <output_dir>")
        sys.exit(1)

    input_file_path = sys.argv[1]
    output_dir = sys.argv[2]
    run_audiveris(input_file_path, output_dir)
