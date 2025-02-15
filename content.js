// content.js

// Minimum dimensions to process an image
const MIN_WIDTH = 100;
const MIN_HEIGHT = 100;

// API key for the try-on service
const FAL_KEY = 'cdcad451-0c07-4d63-b863-8200e2c14481:7f139e4c457371dc5cd4dccd461a4024';

// Utility: Returns a promise that resolves after a given delay (ms)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Poll the status endpoint until the request is completed.
async function pollRequestStatus(requestId, interval = 1000, timeout = 60000) {
  const startTime = Date.now();
  while (true) {
    const response = await fetch(`https://queue.fal.run/fashn/tryon/requests/${requestId}/status`, {
      method: 'GET',
      headers: { 'Authorization': `Key ${FAL_KEY}` }
    });
    
    if (!response.ok) {
      throw new Error(`Status polling failed with status ${response.status}`);
    }
    
    const data = await response.json();
    if (data.status === "COMPLETED") {
      return data;
    }
    
    if (Date.now() - startTime > timeout) {
      throw new Error("Polling timeout exceeded.");
    }
    
    await delay(interval);
  }
}

// Poll the result endpoint until images are available.
async function pollRequestResult(requestId, interval = 1000, timeout = 60000) {
  const startTime = Date.now();
  while (true) {
    const response = await fetch(`https://queue.fal.run/fashn/tryon/requests/${requestId}`, {
      method: 'GET',
      headers: { 'Authorization': `Key ${FAL_KEY}` }
    });
    
    if (!response.ok) {
      throw new Error(`Result polling failed with status ${response.status}`);
    }
    
    const data = await response.json();
    if (data.images) {
      return data.images;
    }
    
    if (Date.now() - startTime > timeout) {
      throw new Error("Polling timeout exceeded.");
    }
    
    await delay(interval);
  }
}

// Send a try-on request using a base64-encoded garment image.
// Once complete, update the provided image element with the new image.
async function sendTryOnRequest(base64Image, imgElement) {
  const url = 'https://queue.fal.run/fashn/tryon';
  const payload = {
    model_image: "https://utfs.io/f/wXFHUNfTHmLj4prvqbRMQ6JXFyUr3IT0avK2HSOmZWiAsxg9",
    garment_image: base64Image,
    category: "tops"
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    const requestId = data.request_id;

    // Wait for the request to complete and then fetch the result images.
    await pollRequestStatus(requestId);
    const resultImages = await pollRequestResult(requestId);
    const resultImageUrl = resultImages[0].url;
    console.log("Result Image URL:", resultImageUrl);

    if (imgElement) {
      imgElement.src = resultImageUrl;
    }
  } catch (error) {
    console.error("Error in sendTryOnRequest:", error);
  }
}

// Create an overlay "Pin" button on the image.
function createPinButton(img) {
  const button = document.createElement("button");
  button.textContent = "Pin";
  
  // Style the button
  Object.assign(button.style, {
    position: "absolute",
    top: "5px",
    right: "5px",
    padding: "4px 8px",
    fontSize: "12px",
    zIndex: "9999",
    cursor: "pointer",
    backgroundColor: "#e60023",
    color: "#fff",
    border: "none",
    borderRadius: "3px",
    display: "none" // Initially hidden; shown on hover.
  });

  // On click: Convert image to base64 and send try-on request.
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();

    // Create a canvas to capture the image
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    
    // If needed, enable CORS: img.crossOrigin = "Anonymous";
    ctx.drawImage(img, 0, 0);

    // Convert canvas content to a base64-encoded JPEG image.
    const base64Image = canvas.toDataURL('image/jpeg');
    sendTryOnRequest(base64Image, img);
  });

  return button;
}

// Wrap the image in a container to properly position the overlay button.
function positionButtonOverImage(img, container) {
  container.style.position = "relative";
  container.style.display = "inline-block";
  container.style.verticalAlign = "middle";

  container.addEventListener("mouseenter", () => {
    const button = container.querySelector("button");
    if (button) {
      button.style.display = "block";
    }
  });

  container.addEventListener("mouseleave", () => {
    const button = container.querySelector("button");
    if (button) {
      button.style.display = "none";
    }
  });

  if (img.parentNode) {
    img.parentNode.insertBefore(container, img);
    container.appendChild(img);
  }
}

// Process an image by adding the overlay button if it meets criteria.
function processImage(img) {
  // Mark the image to avoid duplicate processing.
  img.dataset.extensionProcessed = "true";

  // Create a container to wrap the image and the button.
  const container = document.createElement("div");
  positionButtonOverImage(img, container);

  // Create and add the pin button.
  const pinButton = createPinButton(img);
  container.appendChild(pinButton);
}

// Callback for the MutationObserver to process newly added images.
function observerCallback(mutationsList) {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === "IMG") {
          // If the node is an image element, process it once loaded.
          const img = node;
          img.addEventListener("load", () => {
            if (img.naturalWidth >= MIN_WIDTH &&
                img.naturalHeight >= MIN_HEIGHT &&
                !img.dataset.extensionProcessed) {
              processImage(img);
            }
          });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // For any added element, check for nested images.
          const imgs = node.querySelectorAll("img");
          imgs.forEach((img) => {
            img.addEventListener("load", () => {
              if (img.naturalWidth >= MIN_WIDTH &&
                  img.naturalHeight >= MIN_HEIGHT &&
                  !img.dataset.extensionProcessed) {
                processImage(img);
              }
            });
          });
        }
      });
    }
  }
}

// Observe the document for any changes to process dynamically added images.
const observer = new MutationObserver(observerCallback);
observer.observe(document.documentElement, { childList: true, subtree: true });

// Process images already on the page at load time.
document.querySelectorAll("img").forEach((img) => {
  if (img.naturalWidth >= MIN_WIDTH &&
      img.naturalHeight >= MIN_HEIGHT &&
      !img.dataset.extensionProcessed) {
    processImage(img);
  }
});
