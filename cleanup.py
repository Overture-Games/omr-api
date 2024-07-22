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

output_directory = '/Users/hguan/Documents/GitHub/omr-api/output'
uploads_directory = '/Users/hguan/Documents/GitHub/omr-api/uploads'

remove_files_and_folders(output_directory)
remove_files_and_folders(uploads_directory)
