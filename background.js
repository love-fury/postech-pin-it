// background.js (service_worker)

// You can leave this empty for now if you are not handling
// special background events. This script is required to be
// declared for manifest_version: 3, but the code can be minimal.

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed.");
});

// Example of a message listener if you prefer to handle
// the POST request from the background instead of content script.
/*
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'postImage') {
      fetch('https://example.com', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: request.imageUrl }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(res => res.json())
        .then(data => sendResponse(data))
        .catch(error => console.error('Error:', error));
      return true; // keep the message channel open for async response
    }
  });
  */
