// Turns a picked image File into a small square data: URI, stored directly
// on the player's Firestore doc. No Firebase Storage bucket to set up this
// way — the whole app already runs on Firestore alone. Crop is a simple
// centered square (no drag-to-reposition UI) to keep this a quick in-app
// upload rather than a full photo editor; resized down aggressively since
// it's rendered as a ~40px circle everywhere and Firestore caps a document
// at 1MB.
const OUTPUT_SIZE = 160;
const JPEG_QUALITY = 0.82;

export function fileToPlayerPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Please pick an image file."));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;

        const canvas = document.createElement("canvas");
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image."));
    };
    img.src = url;
  });
}
