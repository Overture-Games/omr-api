const socket = io();

const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');

dropArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropArea.classList.add('dragover');
});

dropArea.addEventListener('dragleave', (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropArea.classList.remove('dragover');
});

dropArea.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropArea.classList.remove('dragover');
    const files = event.dataTransfer.files;
    fileInput.files = files;
});

document.getElementById('uploadForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
    });

    const messageElement = document.getElementById('message');
    const downloadButtonsElement = document.getElementById('downloadButtons');
    
    if (response.ok) {
        const data = await response.json();
        messageElement.textContent = 'File uploaded successfully!';
        messageElement.style.color = 'green';
        downloadButtonsElement.style.display = 'block';

        document.getElementById('downloadMidi').onclick = () => {
            window.location.href = data.midiFile;
        };

        document.getElementById('downloadMxl').onclick = () => {
            window.location.href = data.mxlFile;
        };

        // Listen for download completion
        document.querySelectorAll('.download-button').forEach(button => {
            button.addEventListener('click', (event) => {
                socket.emit('fileDownloaded', { filePath: button.getAttribute('href') });
            });
        });
    } else {
        messageElement.textContent = 'File upload failed!';
        messageElement.style.color = 'red';
        downloadButtonsElement.style.display = 'none';
    }
});
