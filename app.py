import tkinter as tk
from tkinter import filedialog
import utils

def upload_file():
    filepath = filedialog.askopenfilename()
    if filepath:
        utils.transcribe_file(filepath)
        root.quit()  # Quit the Tkinter application after file processing

# Create the main window
root = tk.Tk()
root.title("Audiveris File Transcription")

# Create a button to upload a file
upload_button = tk.Button(root, text="Upload File", command=upload_file)
upload_button.pack(pady=20)

# Start the Tkinter main loop
root.mainloop()
