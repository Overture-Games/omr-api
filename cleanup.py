# cleanup.py

import os
import logging

OUTPUT_DIR = 'output'

def cleanup_files():
    try:
        for filename in os.listdir(OUTPUT_DIR):
            file_path = os.path.join(OUTPUT_DIR, filename)
            os.remove(file_path)
            logging.debug(f'Deleted file: {file_path}')
    except Exception as e:
        logging.error(f'Error cleaning up files: {e}')

if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    cleanup_files()
