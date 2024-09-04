document.addEventListener('DOMContentLoaded', () => {
    const socket = io.connect('http://localhost:5000');
    // const socket = io.connect('https://sheetmusictomidi.com');
    let userUuid;

    // Handle receiving the userUuid from the server
    socket.on('userUuid', (uuid) => {
        console.log('Received userUuid:', uuid);
        userUuid = uuid;
    });

    // Verify socket connection
    socket.on('connect', () => {
        console.log('Socket connected');
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
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

    // Get the modal
    var modal = document.getElementById("contactUsModal");

    // Get the button that opens the modal
    var btn = document.getElementById("contactUsBtn");

    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];

    // When the user clicks the button, open the modal
    btn.onclick = function() {
        modal.style.display = "block";
    }

    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Handle selected files
    function handleFiles(files) {
        const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image.heic', 'image/svg+xml', 'application/pdf'];
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
        console.log('Loading bar started');

        // Simulate loading progress (if real-time progress is not available)
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 95) { 
                progress += 1;
                loadingBarInner.style.width = `${progress}%`;
                console.log(`Loading bar progress: ${progress}%`);
            } else {
                clearInterval(progressInterval);
            }
        }, 200);

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('userUuid', userUuid); // Append userUuid to the form data

        try {
            console.log('Uploading file...');
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                console.log('File uploaded successfully, waiting for processing to complete...');
    
                const responseData = await response.json();
                const userUuid = responseData.userUuid; // Ensure userUuid is correctly set
                const checkFileInterval = setInterval(async () => {
                    const checkResponse = await fetch(`/check-file?userUuid=${userUuid}`);
                    const checkData = await checkResponse.json();
    
                    if (checkData.exists) {
                        clearInterval(checkFileInterval);
                        console.log('Processing complete: MIDI file is available');
    
                        clearInterval(progressInterval); // Stop the simulated progress
                        loadingBarInner.style.width = '100%';
                        loadingBarInner.classList.add('complete'); // Add class to change color
                        console.log('Loading bar progress: 100%');
    
                        loadingBarInner.addEventListener('transitionend', () => {
                            console.log('Loading bar transition ended');
                            loadingBar.style.display = 'none';
                            downloadButtons.style.display = 'flex'; // Show buttons after processing
    
                            // Use the base filename returned by the server
                            const baseFilename = checkData.baseFilename;
    
                            // Update the existing download button for MIDI file
                            document.getElementById('downloadMidi').onclick = () => {
                                window.location.href = `/output/${userUuid}/${baseFilename}.mid`;
                            };
    
                            // Update the existing download button for MXL file
                            document.getElementById('downloadMxl').onclick = () => {
                                window.location.href = `/output/${userUuid}/${baseFilename}.mxl`;
                            };
    
                            // Listen for download completion
                            document.querySelectorAll('.download-button').forEach(button => {
                                button.addEventListener('click', () => {
                                    console.log('Download button clicked');
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
                    }
                }, 5000); // Check every 5 seconds
            } else {
                showErrorMessage('File upload failed!');
                loadingBar.style.display = 'none';
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            showErrorMessage('Error uploading file!');
            loadingBar.style.display = 'none';
        };
    });
});