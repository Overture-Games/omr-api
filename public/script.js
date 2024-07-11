document.getElementById('uploadForm').addEventListener('submit', async function(event) {
    event.preventDefault();
  
    const formData = new FormData();
    const fileInput = document.getElementById('fileInput');
    formData.append('file', fileInput.files[0]);
  
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData,
    });
  
    const messageElement = document.getElementById('message');
    
    if (response.ok) {
      messageElement.textContent = 'File uploaded successfully!';
      messageElement.style.color = 'green';
    } else {
      messageElement.textContent = 'File upload failed!';
      messageElement.style.color = 'red';
    }
  });
  