import tkinter as tk
from tkinter import filedialog
import utils

def upload_file():
    filepath = filedialog.askopenfilename(title="Select a file to transcribe")
    if filepath:
        utils.run_audiveris(filepath)
        root.quit()  # Quit the Tkinter application after file processing

# Create the main window
root = tk.Tk()
root.title("Audiveris File Transcription")

# Enlarge the window
root.geometry("400x100")

# Create a button to upload a file
upload_button = tk.Button(root, text="Upload File", command=upload_file)
upload_button.pack(pady=20)

# Start the Tkinter main loop
root.mainloop()
