const MIN_WIDTH = 100;
const MIN_HEIGHT = 100;

const FAL_KEY = ''; 

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollRequestStatus(requestId, interval = 1000, timeout = 60000) {
  const startTime = Date.now();
  while (true) {
    const temp_response = await fetch(`https://queue.fal.run/fashn/tryon/requests/${requestId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${FAL_KEY}`
      }
    });
    
    if (!temp_response.ok) {
      throw new Error(`Status polling failed with status ${temp_response.status}`);
    }
    
    const temp_data = await temp_response.json();
    const status = temp_data.status;
    
    if (status === "COMPLETED") {
      return temp_data;
    }
    
    if (Date.now() - startTime > timeout) {
      throw new Error("Polling timeout exceeded.");
    }
    
    await delay(interval);
  }
}

async function pollRequestResult(requestId, interval = 1000, timeout = 60000) {
  const startTime = Date.now();
  while (true) {
    const response = await fetch(`https://queue.fal.run/fashn/tryon/requests/${requestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${FAL_KEY}`
      }
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

    await pollRequestStatus(requestId);
    const result = await pollRequestResult(requestId);
    const imgURL = result[0].url;
    console.log("RESULT:", imgURL);

    if(imgElement) {
      imgElement.src = imgURL;
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

function createPinButton(img) {
  const button = document.createElement("button");
  button.textContent = "Pin";
  button.style.position = "absolute";
  button.style.top = "5px";
  button.style.right = "5px";
  button.style.padding = "4px 8px";
  button.style.fontSize = "12px";
  button.style.zIndex = "9999";
  button.style.cursor = "pointer";
  button.style.backgroundColor = "#e60023"; 
  button.style.color = "#fff";
  button.style.border = "none";
  button.style.borderRadius = "3px";
  button.style.display = "none"; 

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    
    // img.crossOrigin = "Anonymous"; 

    ctx.drawImage(img, 0, 0);

    const dataURL = canvas.toDataURL('image/jpeg');
    sendTryOnRequest(dataURL, img);
  });

  return button;
}

function positionButtonOverImage(img, buttonContainer) {
  buttonContainer.style.position = "relative";
  buttonContainer.style.display = "inline-block";
  buttonContainer.style.verticalAlign = "middle";

  buttonContainer.addEventListener("mouseenter", () => {
    const btn = buttonContainer.querySelector("button");
    if (btn) {
      btn.style.display = "block";
    }
  });

  buttonContainer.addEventListener("mouseleave", () => {
    const btn = buttonContainer.querySelector("button");
    if (btn) {
      btn.style.display = "none";
    }
  });

  if (img.parentNode) {
    img.parentNode.insertBefore(buttonContainer, img);
    buttonContainer.appendChild(img);
  }
}

function processImage(img) {
  img.dataset.extensionProcessed = "true";

  const container = document.createElement("div");
  positionButtonOverImage(img, container);

  const button = createPinButton(img);
  container.appendChild(button);
}

const observerCallback = function (mutationsList) {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === "IMG") {
          const img = node;
          img.addEventListener("load", () => {
            if (
              img.naturalWidth >= MIN_WIDTH &&
              img.naturalHeight >= MIN_HEIGHT &&
              !img.dataset.extensionProcessed
            ) {
              processImage(img);
            }
          });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const imgs = node.querySelectorAll("img");
          imgs.forEach((img) => {
            img.addEventListener("load", () => {
              if (
                img.naturalWidth >= MIN_WIDTH &&
                img.naturalHeight >= MIN_HEIGHT &&
                !img.dataset.extensionProcessed
              ) {
                processImage(img);
              }
            });
          });
        }
      });
    }
  }
};

const observer = new MutationObserver(observerCallback);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

document.querySelectorAll("img").forEach((img) => {
  if (
    img.naturalWidth >= MIN_WIDTH &&
    img.naturalHeight >= MIN_HEIGHT &&
    !img.dataset.extensionProcessed
  ) {
    processImage(img);
  }
});
