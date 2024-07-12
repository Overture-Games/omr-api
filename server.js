import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const port = 5000;

const server = http.createServer(app);
const io = new Server(server);

const upload = multer({ dest: 'uploads/' });

// CORS Middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Route for the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(path.resolve(), 'public', 'index.html'));
});

// Combined Upload and Transcribe Endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }

  const inputFilePath = path.join(path.resolve(), 'uploads', req.file.filename);
  const outputDir = path.join(path.resolve(), 'output');

  console.log(`File received for transcription: ${inputFilePath}`);

  // Call the Python script to run Audiveris
  const pythonProcess = spawn('python3', ['utils.py', inputFilePath, outputDir]);

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
      const midiFilePath = path.join(outputDir, `${baseFilename}.mid`);
      const mxlFilePath = path.join(outputDir, `${baseFilename}.mxl`);

      res.json({
        midiFile: `/output/${baseFilename}.mid`,
        mxlFile: `/output/${baseFilename}.mxl`
      });

      // Optionally, delete the uploaded file after processing
      fs.unlinkSync(inputFilePath);
    } else {
      res.status(500).send('Error processing file');
    }
  });
}); 

// Serve the output directory for downloads
app.use('/output', express.static('output'));

// WebSocket connection
io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('fileDownloaded', (data) => {
    console.log(`File downloaded: ${data.filePath}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');

    // Clean up files in uploads and output
    ['uploads', 'output'].forEach((dir) => {
      fs.readdir(dir, (err, files) => {
        if (err) throw err;

        for (const file of files) {
          fs.unlink(path.join(dir, file), err => {
            if (err) throw err;
          });
        }
      });
    });
  });
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
