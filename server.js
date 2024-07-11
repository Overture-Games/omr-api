import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const app = express();
const port = 5000;

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

  const filePath = path.join(path.resolve(), 'uploads', req.file.filename);
  console.log(`File received for transcription: ${filePath}`);

  // Call the Python script
  exec(`python3 utils.py ${filePath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing Python script: ${error.message}`);
      return res.status(500).send(`Error processing file: ${error.message}`);
    }
    if (stderr) {
      console.error(`Error in Python script: ${stderr}`);
      return res.status(500).send(`Error processing file: ${stderr}`);
    }

    console.log(`Python script output: ${stdout}`);
    res.send('File processing complete!');
    
    // Clean up the uploaded file
    fs.unlinkSync(filePath);
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
