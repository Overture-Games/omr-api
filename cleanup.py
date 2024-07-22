import os

def remove_files(directory):
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        if os.path.isfile(file_path):
            os.remove(file_path)

output_directory = '/path/to/output'
uploads_directory = '/path/to/uploads'

remove_files(output_directory)
remove_files(uploads_directory)
