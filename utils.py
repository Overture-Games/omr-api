###
### Utility functions for running Audiveris OMR on a file.
###

import os
import subprocess
import logging
from PIL import Image
from music21 import converter # type: ignore
import sys
from cairosvg import svg2png # type: ignore

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
    
def convert_svg_to_png(svg_path, png_path):
    """Convert SVG image to PNG."""
    try:
        svg2png(url=svg_path, write_to=png_path)
        logging.debug(f'Converted SVG to PNG: {png_path}')
    except Exception as e:
        logging.error(f'Error converting SVG to PNG: {str(e)}')
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
    # AUDIVERIS_PATH = '/home/ubuntu/audiveris/app/build/scripts/Audiveris'
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
        elif file_ext == 'svg':
            png_filename = f"{os.path.splitext(os.path.basename(input_filepath))[0]}.png"
            png_filepath = os.path.join(output_dir, png_filename)
            convert_svg_to_png(input_filepath, png_filepath)
            input_filepath = png_filepath

        # Run Audiveris command
        command = [AUDIVERIS_PATH, '-batch', '-output', output_dir, input_filepath]
        # command = [AUDIVERIS_PATH, '-output', output_dir, input_filepath]
        logging.debug(f'Running Audiveris command: {" ".join(command)}')

        try:
            result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=500)
            stdout, stderr = result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            logging.error('Audiveris command timed out')
            generate_midi_from_mxl(input_filepath, output_dir)
            cleanup_files(output_dir)
            return

        logging.debug(f'Audiveris output: {stdout.decode("utf-8")}')
        logging.debug(f'Audiveris errors: {stderr.decode("utf-8")}')

        if result.returncode != 0:
            raise subprocess.CalledProcessError(result.returncode, command, output=stdout, stderr=stderr)

        logging.debug(f'Contents of output directory after running Audiveris: {os.listdir(output_dir)}')

        # Check for generated OMR file
        omr_files = [f for f in os.listdir(output_dir) if f.endswith('.omr')]
        if not omr_files:
            logging.error("No OMR file generated")
            return

        omr_filepath = os.path.join(output_dir, omr_files[0])
        base_filename = os.path.splitext(os.path.basename(input_filepath))[0]
        mxl_filepath = os.path.join(output_dir, f"{base_filename}.mxl")
        export_command = [AUDIVERIS_PATH, '-batch', '-export', omr_filepath, '-output', mxl_filepath]
        # export_command = [AUDIVERIS_PATH, '-export', omr_filepath, '-output', mxl_filepath]

        try:
            export_result = subprocess.run(export_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=20)
            logging.debug(f'Export output: {export_result.stdout.decode("utf-8")}')
            logging.debug(f'Export errors: {export_result.stderr.decode("utf-8")}')
        except subprocess.TimeoutExpired:
            logging.error('Export command timed out')
            generate_midi_from_mxl(input_filepath, output_dir)
            cleanup_files(output_dir)
            return
        except subprocess.CalledProcessError as e:
            logging.error(f'Export command failed: {e.stderr.decode("utf-8")}')
            return

        if not os.path.exists(mxl_filepath):
            logging.error('No MusicXML file generated')
            return

        logging.debug(f'Export output: {stdout.decode("utf-8")}')
        logging.debug(f'Export errors: {stderr.decode("utf-8")}')
        
        generate_midi_from_mxl(input_filepath, output_dir)
        cleanup_files(output_dir)
        logging.debug(f'Contents of output directory after exporting: {os.listdir(output_dir)}')
        
        logging.info("Processing complete")

    except subprocess.CalledProcessError as e:
        logging.error(f'Processing failed: {e.stderr.decode("utf-8")}')
    finally:
        logging.debug('Audiveris process completed.')

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 utils.py <input_file_path> <output_dir>")
        sys.exit(1)

    input_file_path = sys.argv[1]
    output_dir = sys.argv[2]
    run_audiveris(input_file_path, output_dir)
