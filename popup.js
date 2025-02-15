// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("imageUpload");
  const saveBtn = document.getElementById("saveBtn");
  const message = document.getElementById("message");
  let selectedFile = null;

  // Capture the selected file
  fileInput.addEventListener("change", (e) => {
    selectedFile = e.target.files[0];
  });

  // Save the file to chrome.storage
  saveBtn.addEventListener("click", () => {
    if (!selectedFile) {
      message.textContent = "No file selected.";
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      // e.target.result is base64 encoded image data
      const base64Image = e.target.result;

      // Store in chrome.storage.local
      chrome.storage.local.set({ uploadedImage: base64Image }, () => {
        message.textContent = "Image saved successfully!";
      });
    };
    reader.readAsDataURL(selectedFile);
  });
});
