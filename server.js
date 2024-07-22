import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;
const pythonPath = process.env.PYTHON_PATH || 'python3';

const server = http.createServer(app);
const io = new Server(server);

const upload = multer({ dest: 'uploads/' });

// Ensure the directory exists
const ensureDirectoryExistence = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

ensureDirectoryExistence(path.join(__dirname, 'uploads'));
ensureDirectoryExistence(path.join(__dirname, 'output'));

// CORS Middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Route for the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
  const userUuid = req.body.userUuid; // Extract userUuid from the request body
  console.log("User UUID: %s\n", userUuid);

  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }

  const userUploadDir = path.join(__dirname, 'uploads', userUuid);
  const userOutputDir = path.join(__dirname, 'output', userUuid);

  ensureDirectoryExistence(userUploadDir);
  ensureDirectoryExistence(userOutputDir);

  const inputFilePath = path.join(userUploadDir, req.file.filename);

  // Move the uploaded file to the user's directory
  try {
    fs.renameSync(req.file.path, inputFilePath);
  } catch (err) {
    console.error('Error moving file:', err);
    return res.status(500).send('Error moving file');
  }

  console.log(`File received for transcription: ${inputFilePath}`);

  // Call the Python script to run Audiveris
  const pythonProcess = spawn(pythonPath, ['utils.py', inputFilePath, userOutputDir]);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);

    if (code === 0) {
      const baseFilename = path.basename(req.file.filename, path.extname(req.file.filename));
      const midiFilePath = path.join(userOutputDir, `${userUuid}_${baseFilename}.mid`);
      const mxlFilePath = path.join(userOutputDir, `${userUuid}_${baseFilename}.mxl`);

      res.json({
        midiFile: `/output/${userUuid}/${baseFilename}.mid`,
        mxlFile: `/output/${userUuid}/${baseFilename}.mxl`
      });

      // Optionally, delete the uploaded file after processing
      fs.rm(inputFilePath, { force: true }, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
        }
      });
    } else {
      res.status(500).send('Error processing file');
    }
  });
});

// Serve the output directory for downloads
app.use('/output', express.static(path.join(__dirname, 'output')));

// WebSocket connection
io.on('connection', (socket) => {
  const userUuid = uuidv4();
  socket.userUuid = userUuid;

  const userDir = path.join(__dirname, 'uploads', userUuid);

  // Ensure the user's directory exists
  ensureDirectoryExistence(userDir);

  console.log(`User connected: ${userUuid}`);

  // Emit the userUuid to the client
  socket.emit('userUuid', userUuid);

  // Handle file upload event
  socket.on('fileUploaded', (filePath) => {
    const fileName = path.basename(filePath);
    const newFilePath = path.join(userDir, fileName);

    fs.rename(filePath, newFilePath, (err) => {
      if (err) {
        console.error('Error moving file:', err);
      } else {
        console.log(`File moved to: ${newFilePath}`);
      }
    });
  });

  // Handle file download event
  socket.on('fileDownloaded', (data) => {
    console.log(`File downloaded: ${data.filePath}`);
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userUuid}`);

    // Delete the user's directory and its contents
    fs.rm(userDir, { recursive: true, force: true }, (err) => {
      if (err) {
        console.error('Error deleting user directory:', err);
      } else {
        console.log(`User directory deleted: ${userDir}`);
      }
    });

    // Clean up files in the user's output directory
    const userOutputDir = path.join(__dirname, 'output', userUuid);
    fs.rm(userOutputDir, { recursive: true, force: true }, (err) => {
      if (err) {
        console.error('Error deleting user output directory:', err);
      } else {
        console.log(`User output directory deleted: ${userOutputDir}`);
      }
    });
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
