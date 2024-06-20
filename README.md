# OMR-API

## Description
This project is designed to transcribe sheet music from various formats into MusicXML and MIDI files using Audiveris and Music21 libraries. It supports HEIC image format conversion to PNG for processing. The transcribed MusicXML files are further exported to MIDI format for playback and editing in MIDI-compatible software.

## Features
- Convert HEIC images to PNG for transcription.
- Use Audiveris for optical music recognition (OMR) to generate MusicXML files.
- Export MusicXML files to MIDI format for playback and editing.
- Clean up unnecessary files from the output directory after processing.
- Tkinter-based GUI for file upload and processing initiation.

## Requirements
- Python 3.8 or higher
- Dependencies listed in `requirements.txt`:
  ```
  Flask==2.0.2
  Pillow==8.4.0
  reportlab==3.6.3
  music21==7.0.0
  ```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Ensure Audiveris is installed and configured. Set `AUDIVERIS_PATH` in your environment or directly in the script (`app.py`).

## Usage
1. **Uploading a File**
   - Run `app.py` using Python:
     ```
     python app.py
     ```
   - A Tkinter window will open. Click on "Upload File" to select a file for transcription.

2. **Transcription Process**
   - The selected file (supports HEIC format) will be converted to PNG if necessary.
   - Audiveris will perform optical music recognition (OMR) to generate a MusicXML file in the `output` directory.
   - The MusicXML file will be exported to MIDI format for playback and editing.
   - After processing, unnecessary files in the `output` directory will be cleaned up automatically.

3. **Cleanup**
   - To manually clean up all files in the `output` directory, run:
     ```
     python clean.py
     ```

## Notes
- Ensure sufficient system resources for Audiveris processing due to potential timeout issues.
- For issues or enhancements, please open an issue on GitHub or contact the project maintainers.