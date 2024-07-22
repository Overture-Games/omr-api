###
### This script is used to remove all files and folders in the output and uploads directories.
###

import os
import shutil

def remove_files_and_folders(directory):
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        if os.path.isfile(file_path):
            os.remove(file_path)
        elif os.path.isdir(file_path):
            shutil.rmtree(file_path)

# Get the directory of the current script
current_directory = os.path.dirname(os.path.abspath(__file__))

# Construct the paths for output and uploads directories
output_directory = os.path.join(current_directory, 'output')
uploads_directory = os.path.join(current_directory, 'uploads')

remove_files_and_folders(output_directory)
remove_files_and_folders(uploads_directory)