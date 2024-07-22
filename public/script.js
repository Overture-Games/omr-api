document.addEventListener('DOMContentLoaded', () => {
    const socket = io.connect('http://localhost:5000');
    let userUuid;

    // Handle receiving the userUuid from the server
    socket.on('userUuid', (uuid) => {
        console.log('Received userUuid:', uuid);
        userUuid = uuid;
    });

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
        const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/svg+xml', 'application/pdf'];
        const unsupportedFiles = Array.from(files).filter(file => !supportedFormats.includes(file.type));

        if (unsupportedFiles.length > 0) {
            showErrorMessage('Unsupported file format! Please upload JPEG, JPG, PNG, HEIC, SVG, or PDF files.');
            return;
        }

        fileInput.files = files; // Update file input files
    }

    // Show error message
    function showErrorMessage(message) {
        const errorBanner = document.createElement('div');
        errorBanner.className = 'error-banner';
        errorBanner.textContent = message;
        dropArea.appendChild(errorBanner);

        setTimeout(() => {
            dropArea.removeChild(errorBanner);
        }, 4000);
    }

    // Initialize elements
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileInput');
    const processButton = document.getElementById('processButton');
    const loadingBar = document.getElementById('loadingBar');
    const loadingBarInner = document.querySelector('.loading-bar-inner');
    const downloadButtons = document.getElementById('downloadButtons');
    const messageElement = document.getElementById('message');

    // FAQ
    const faqItems = Array.from(document.querySelectorAll('.cs-faq-item'));
    faqItems.forEach(item => {
        item.addEventListener('click', () => {
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            item.classList.toggle('active');
        });
    });

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

    // Trigger file input click on drop area click
    dropArea.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle file input change
    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
    });

    processButton.addEventListener('click', async () => {
        if (fileInput.files.length === 0) {
            showErrorMessage('Please upload a file first!');
            return;
        }

        if (!userUuid) {
            showErrorMessage('User UUID is not available!');
            return;
        }

        // Disable the button and change its text
        processButton.disabled = true;
        processButton.textContent = 'Processing...';
        processButton.classList.add('disabled');

        // Show the loading bar
        loadingBar.style.display = 'block';
        loadingBarInner.style.width = '0';
        setTimeout(() => {
            loadingBarInner.style.width = '100%';
        }, 100);

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('userUuid', userUuid); // Append userUuid to the form data

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();

                // Wait for the loading bar to complete
                loadingBarInner.addEventListener('transitionend', () => {
                    loadingBar.style.display = 'none';
                    downloadButtons.style.display = 'flex'; // Show buttons after processing

                    document.getElementById('downloadMidi').onclick = () => {
                        window.location.href = data.midiFile;
                    };

                    document.getElementById('downloadMxl').onclick = () => {
                        window.location.href = data.mxlFile;
                    };

                    // Listen for download completion
                    document.querySelectorAll('.download-button').forEach(button => {
                        button.addEventListener('click', () => {
                            socket.emit('fileDownloaded', { filePath: button.getAttribute('href') });
                        });
                    });

                    // Update the button to "Process Another File"
                    processButton.textContent = 'Process Another File';
                    processButton.disabled = false;
                    processButton.classList.remove('disabled');

                    // Reset the site when "Process Another File" is clicked
                    processButton.addEventListener('click', () => {
                        location.reload();
                    }, { once: true });
                });
            } else {
                showErrorMessage('File upload failed!');
                loadingBar.style.display = 'none';
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            showErrorMessage('Error uploading file!');
            loadingBar.style.display = 'none';
        }
    });
});
