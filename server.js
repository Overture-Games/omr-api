import express from 'express';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bodyParser from 'body-parser';
import sgMail from '@sendgrid/mail';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;
// const pythonPath = '/home/ubuntu/omr-api/myenv/bin/python';
const pythonPath = '/Users/hguan/Documents/GitHub/omr-api/myenv/bin/python';

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

// Use body-parser middleware to parse JSON and urlencoded request bodies
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const allowedOrigin = process.env.NODE_ENV === 'production' 
  ? 'http://sheetmusictomidi.com' 
  : 'http://localhost:5000'; // Change this to your local development URL

app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Route for the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
  const userUuid = req.body.userUuid;
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

  // Move the uploaded file to the user directory
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
      console.log('Processing complete:');
      const baseFilename = path.basename(req.file.filename, path.extname(req.file.filename));

      const midiFile = `/output/${userUuid}/${baseFilename}.mid`;
      const mxlFile = `/output/${userUuid}/${baseFilename}.mxl`;

      res.json({
        userUuid,
        midiFile,
        mxlFile
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

// Endpoint to check if any .mid file exists
app.get('/check-file', (req, res) => {
  const { userUuid } = req.query;
  const userOutputDir = path.join(__dirname, 'output', userUuid);

  fs.readdir(userOutputDir, (err, files) => {
    if (err) {
      return res.status(500).json({ exists: false });
    }

    const midiFiles = files.filter(file => path.extname(file) === '.mid');
    if (midiFiles.length > 0) {
      const baseFilename = path.basename(midiFiles[0], '.mid'); // Get the base filename without extension
      return res.json({ exists: true, baseFilename });
    } else {
      return res.status(404).json({ exists: false });
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

  // Ensure the user directory exists
  ensureDirectoryExistence(userDir);

  console.log(`User connected: ${userUuid}`);

  // Emit the userUuid to the client
  socket.emit('userUuid', userUuid);

  // Join a room with the userUuid
  socket.join(userUuid);

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

    // Delete the user directory and its contents
    fs.rm(userDir, { recursive: true, force: true }, (err) => {
      if (err) {
        console.error('Error deleting user directory:', err);
      } else {
        console.log(`User directory deleted: ${userDir}`);
      }
    });

    // Clean up files in the user output directory
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

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Middleware to parse JSON bodies
app.use(express.json());

// Email sending route
app.post('/send-email', (req, res) => {
  const { name, email, message } = req.body;

  const msg = {
    to: process.env.EMAIL_USER_TO, // Your email
    from: process.env.EMAIL_USER_FROM, // Verified sender email
    subject: 'Contact Form Query',
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
  };

  sgMail.send(msg)
    .then(() => {
      res.status(300).send('Email sent successfully! We will get back to your query as soon as possible.');
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send(error.toString());
    });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://ec2-54-242-127-146.compute-1.amazonaws.com:${port}/`);
});