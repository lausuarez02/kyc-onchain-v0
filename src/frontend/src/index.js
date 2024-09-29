import { backend } from "../../declarations/backend";

document.getElementById("classify").onclick = classify;
document.getElementById("file").onchange = onImageChange;

async function classify(event) {
  event.preventDefault();

  const button = event.target;
  const message = document.getElementById("message");
  const loader = document.getElementById("loader");
  const img = document.getElementById("image");

  button.disabled = true;
  button.className = "clean-button invisible";
  message.innerText = "Computing...";
  loader.className = "loader";

  try {
    const arrayBuffer = await resize(img);
    const blob = new Uint8Array(arrayBuffer); // Convert ArrayBuffer to Uint8Array
    console.log('Resized Uint8Array:', blob); // Debugging log

    let result;

    result = await backend.classify(blob);

    if (result.Ok) {
      render(message, result.Ok);
    } else {
      throw result.Err;
    }
  } catch (err) {
    console.error('Error during classification:', err); // Debugging log
    message.innerText = "Failed to classify image: " + JSON.stringify(err);
  }

  loader.className = "loader invisible";

  return false;
}
// Resizes the given image to a smaller resolution and returns the resulting image blob.
async function resize(img) {
  const canvas = document.createElement("canvas");
  
  // Reduce the canvas size for smaller resolution
  canvas.width = 112;  // Reduced from 224 to 112
  canvas.height = 112;  // Reduced from 224 to 112

  let scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
  let width = img.naturalWidth * scale;
  let height = img.naturalHeight * scale;
  let x = canvas.width / 2 - width / 2;
  let y = canvas.height / 2 - height / 2;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(img, x, y, width, height);
  }

  // Compress and serialize the image into JPEG bytes with lower quality
  let bytes = await serialize(canvas, "image/png", 0.7); // Changed to JPEG and reduced quality to 0.7
  return bytes;
}

// Serializes the given canvas into image bytes.
function serialize(canvas, format = "image/png", quality = 0.9) {
  return new Promise((resolve) => 
    canvas.toBlob(
      (blob) => blob.arrayBuffer().then(resolve), 
      format, 
      quality
    )
  );
}

// async function classify(event) {
//   event.preventDefault();

//   const button = event.target;
//   const message = document.getElementById("message");
//   const loader = document.getElementById("loader");
//   const img = document.getElementById("image");
//   const repl_option = document.getElementById("replicated_option");

//   button.disabled = true;
//   button.className = "clean-button invisible";
//   repl_option.className = "option invisible";
//   message.innerText = "Computing...";
//   loader.className = "loader";

//   try {
//     // Resize and normalize the image
//     const float32Array = await resizeAndNormalize(img);
//     console.log('Resized and normalized Float32Array:', float32Array); // Debugging log

//     let result;
//     // Ensure the correct classification method is called
//     if (document.getElementById("replicated").checked) {
//       result = await backend.classify(float32Array); // Send normalized data
//     } else {
//       result = await backend.classify_query(float32Array);
//     }

//     console.log('Backend response:', result); // Debugging log

//     if (result.Ok) {
//       render(message, result.Ok);
//     } else {
//       throw result.Err;
//     }
//   } catch (err) {
//     console.error('Error during classification:', err); // Debugging log
//     message.innerText = "Failed to classify image: " + JSON.stringify(err);
//   }

//   loader.className = "loader invisible";
//   return false;
// }



// Resizes the given image to 224x224px, normalizes the pixels, and returns the resulting Uint8Array.
// async function resizeAndNormalize(img) {
//   const canvas = document.createElement("canvas");
//   const targetSize = 224; // Resize to 224x224

//   // Set canvas size
//   canvas.width = targetSize;
//   canvas.height = targetSize;

//   const ctx = canvas.getContext("2d");
//   if (ctx) {
//       // Draw the image onto the canvas, scaling it to fit
//       ctx.drawImage(img, 0, 0, targetSize, targetSize);
//   }

//   // Get image data
//   const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
//   const data = imageData.data;

//   // Create a new Float32Array to hold the values
//   const float32Array = new Float32Array(3 * targetSize * targetSize);

//   for (let i = 0; i < data.length; i += 4) {
//       const r = data[i] / 255;     // Red
//       const g = data[i + 1] / 255; // Green
//       const b = data[i + 2] / 255; // Blue

//       // Store normalized values for the model
//       float32Array[(i / 4) * 3] = (r - 0.485) / 0.229; // Normalization values must match the model
//       float32Array[(i / 4) * 3 + 1] = (g - 0.456) / 0.224; 
//       float32Array[(i / 4) * 3 + 2] = (b - 0.406) / 0.225; 
//   }

//   return float32Array; // Return the float32 values
// }

// Adds the classification results as a list to the given DOM element.
function render(element, classification) {
  element.innerText = "Results:";
  let ul = document.createElement("ul");
  for (let item of classification) {
    let li = document.createElement("li");
    let b = document.createElement("b");
    b.innerText = item.label.toLowerCase();
    let t = document.createTextNode("[score " + Math.round(item.score * 10) / 10 + "]");
    li.appendChild(b);
    li.appendChild(t);
    ul.appendChild(li)
  }
  element.appendChild(ul);
}

// This function is called when the user selects a new image file.
async function onImageChange(event) {
  const button = document.getElementById("classify");
  const message = document.getElementById("message");
  const img = document.getElementById("image");
  try {
    const file = event.target.files[0];
    const url = await toDataURL(file);
    img.src = url;
    img.width = 600;
    img.className = "image";
  } catch (err) {
    message.innerText = "Failed to select image: " + err.toString();
  }
  button.disabled = false;
  button.className = "clean-button";
  message.innerText = "";
  return false;
}

// Converts the given blob into a data url such that it can be assigned as a
// target of a link of as an image source.
function toDataURL(blob) {
  return new Promise((resolve, _) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(blob);
    fileReader.onloadend = function () {
      resolve(fileReader.result);
    }
  });
}