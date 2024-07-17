const socket = io();

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('fileInput');
const processButton = document.getElementById('processButton');
const loadingBar = document.getElementById('loadingBar');
const loadingBarInner = document.querySelector('.loading-bar-inner');
const downloadButtons = document.getElementById('downloadButtons');
const messageElement = document.getElementById('message');

// FAQ
const faqItems = Array.from(document.querySelectorAll('.cs-faq-item'));
for (const item of faqItems) {
    const onClick = () => {
        // Collapse other sections
        faqItems.forEach(otherItem => {
            if (otherItem !== item) {
                otherItem.classList.remove('active');
            }
        });
        // Toggle the clicked section
        item.classList.toggle('active');
    }
    item.addEventListener('click', onClick);
}

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

processButton.addEventListener('click', async () => {
    if (fileInput.files.length === 0) {
        messageElement.textContent = 'Please select a file first!';
        messageElement.style.color = 'red';
        return;
    }

    loadingBar.style.display = 'block';
    loadingBarInner.style.width = '0';
    setTimeout(() => {
        loadingBarInner.style.width = '100%';
    }, 100);

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();

            setTimeout(() => {
                loadingBar.style.display = 'none';
                downloadButtons.style.display = 'flex'; /* Show buttons after processing */
            });

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
    } catch (error) {
        console.error('Error uploading file:', error);
        messageElement.textContent = 'Error uploading file!';
        messageElement.style.color = 'red';
    }
});
