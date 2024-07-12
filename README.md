# OMR-API

## Description
OMR-API is a project designed to transcribe sheet music from various formats into MusicXML and MIDI files using Audiveris and Music21 libraries. It supports HEIC image format conversion to PNG for processing. The transcribed MusicXML files are further exported to MIDI format for playback and editing in MIDI-compatible software.

## Features
- Convert HEIC images to PNG for transcription.
- Use Audiveris for optical music recognition (OMR) to generate MusicXML files.
- Export MusicXML files to MIDI format for playback and editing.
- Real-time communication with clients using WebSockets.
- Automatic cleanup of unnecessary files after processing.

## Technologies Used
- **Python**: Core programming language for backend processing.
- **Node.js**: JavaScript runtime for the web server.
- **Express.js**: Web framework for Node.js.
- **Multer**: Middleware for handling file uploads in Node.js.
- **Socket.io**: Library for real-time communication between the web client and server.
- **Pillow**: Python Imaging Library (PIL) fork for image processing.
- **Music21**: Toolkit for computer-aided musicology.
- **Audiveris**: Optical Music Recognition (OMR) software.
- **HTML/CSS/JavaScript**: Frontend technologies for the web interface.
- **Docker**: Containerization platform for consistent environment setup.

## Requirements
- Python 3.8 or higher
- Node.js and npm
- Dependencies listed in `requirements.txt` and `package.json`

## Installation
1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install Python dependencies:
   ```sh
   pip install -r requirements.txt
   ```

3. Install Node.js dependencies:
   ```sh
   npm install
   ```

4. Ensure Audiveris is installed and configured. Set `AUDIVERIS_PATH` in your environment or directly in the script (`utils.py`).

## Usage
1. **Starting the Web Server**
   - Run `server.js` using Node.js:
     ```sh
     npm start
     ```
   - The server will start running on `http://localhost:5000`.

2. **Uploading a File**
   - Open a web browser and navigate to `http://localhost:5000`.
   - Use the web interface to upload a file for transcription.

3. **Transcription Process**
   - The selected file (supports HEIC format) will be converted to PNG if necessary.
   - Audiveris will perform optical music recognition (OMR) to generate a MusicXML file in the `output` directory.
   - The MusicXML file will be exported to MIDI format for playback and editing.
   - After processing, unnecessary files in the `output` directory will be cleaned up automatically.

4. **Downloading Transcribed Files**
   - After processing, download links for the MIDI and MusicXML files will be provided in the web interface.

## Notes
- Ensure sufficient system resources for Audiveris processing due to potential timeout issues.
- For issues or enhancements, please open an issue on GitHub or contact the project maintainers.

## package.json
```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "Backend server for file processing",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "child_process": "^1.0.2",
    "express": "^4.19.2",
    "fs": "^0.0.1-security",
    "multer": "^1.4.4",
    "node-fetch": "^2.6.1",
    "path": "^0.12.7",
    "socket.io": "^4.7.5",
    "ws": "^8.18.0"
  },
  "author": "",
  "license": "ISC"
}
```
