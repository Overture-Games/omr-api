const socket = io();

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');

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

// Handle file input change
fileInput.addEventListener('change', handleFiles, false);

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
    files = [...files];
    files.forEach(previewFile);
    fileInput.files = files.length ? files[0] : null;  // Set the first file to the input
}

// Preview file
function previewFile(file) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
        const img = document.createElement('img');
        img.src = reader.result;
        preview.appendChild(img);
    }
}

// Trigger file input click on drop area click
dropArea.addEventListener('click', () => {
    fileInput.click();
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
    }
});
