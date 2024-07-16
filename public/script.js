const socket = io();

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('fileInput');
const processButton = document.getElementById('processButton');
const loadingBar = document.getElementById('loadingBar');
const loadingBarInner = document.querySelector('.loading-bar-inner');
const downloadButtons = document.getElementById('downloadButtons');
const messageElement = document.getElementById('message');

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

// Highlight drop area when item is dragged over it
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

// Handle dropped files
dropArea.addEventListener('drop', handleDrop, false);

// Prevent default behavior for drag events
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop area
function highlight(e) {
    dropArea.classList.add('dragover');
}

// Unhighlight drop area
function unhighlight(e) {
    dropArea.classList.remove('dragover');
}

// Handle dropped files
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// Handle selected files
function handleFiles(files) {
    fileInput.files = files; // Update file input files
}

// Trigger file input click on drop area click
dropArea.addEventListener('click', () => {
    fileInput.click();
});

processButton.addEventListener('click', () => {
    if (fileInput.files.length === 0) {
        messageElement.textContent = 'Please select a file first!';
        messageElement.style.color = 'red';
        return;
    }

    loadingBar.style.display = 'block';
    loadingBarInner.style.width = '100%';

    setTimeout(() => {
        loadingBar.style.display = 'none';
        downloadButtons.style.display = 'block';
        messageElement.textContent = 'Processing complete!';
        messageElement.style.color = 'green';
    }, 10000); // Simulate 10 seconds processing time
});

document.getElementById('uploadForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = new FormData();
    const files = fileInput.files;
    if (files.length > 0) {
        formData.append('file', files[0]);

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            messageElement.textContent = 'File uploaded successfully!';
            messageElement.style.color = 'green';

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
        }
    }
});
