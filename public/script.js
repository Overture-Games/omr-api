document.addEventListener('DOMContentLoaded', () => {
  const ws = new WebSocket(`ws://${window.location.host}`);

  ws.onopen = () => {
    console.log('WebSocket connection established');
  };

  ws.onmessage = (event) => {
    console.log('WebSocket message received:', event.data);
  };

  ws.onclose = () => {
    console.log('WebSocket connection closed');
  };

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
    const downloadButtons = document.getElementById('downloadButtons');
    
    if (response.ok) {
      const data = await response.json();
      messageElement.textContent = 'File uploaded successfully!';
      messageElement.style.color = 'green';
      downloadButtons.style.display = 'block';

      document.getElementById('downloadMidi').onclick = () => {
        window.location.href = data.midiFile;
      };

      document.getElementById('downloadMxl').onclick = () => {
        window.location.href = data.mxlFile;
      };
    } else {
      messageElement.textContent = 'File upload failed!';
      messageElement.style.color = 'red';
      downloadButtons.style.display = 'none';
    }
  });

  window.addEventListener('beforeunload', () => {
    ws.close();
  });
});
