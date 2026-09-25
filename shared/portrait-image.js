export const CHARACTER_PORTRAIT_MAX_EDGE = 1200;
export const CHARACTER_PORTRAIT_TARGET_BYTES = 600 * 1024;
export const CHARACTER_PORTRAIT_WEBP_QUALITY = 0.82;

export const constrainedImageSize = (width, height, maxEdge = CHARACTER_PORTRAIT_MAX_EDGE) => {
  const sourceWidth = Math.max(1, Math.round(Number(width) || 1));
  const sourceHeight = Math.max(1, Math.round(Number(height) || 1));
  const edge = Math.max(1, Math.round(Number(maxEdge) || CHARACTER_PORTRAIT_MAX_EDGE));
  const scale = Math.min(1, edge / Math.max(sourceWidth, sourceHeight));
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale))
  };
};

const canvasBlob = (canvas, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("Could not create the optimized portrait"));
  }, "image/webp", quality);
});

const loadDrawable = async (blob) => {
  if (typeof createImageBitmap === "function") {
    let bitmap;
    try {
      bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch (error) {
      bitmap = await createImageBitmap(blob);
    }
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close()
    };
  }

  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.addEventListener("load", () => resolve(element), { once: true });
      element.addEventListener("error", () => reject(new Error("Could not decode the portrait")), { once: true });
      element.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url)
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
};

export const optimizeCharacterPortrait = async (blob) => {
  const drawable = await loadDrawable(blob);
  try {
    let dimensions = constrainedImageSize(drawable.width, drawable.height);
    let quality = CHARACTER_PORTRAIT_WEBP_QUALITY;
    let output = null;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("Could not prepare the portrait image");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(drawable.source, 0, 0, dimensions.width, dimensions.height);
      output = await canvasBlob(canvas, quality);

      if (output.type !== "image/webp") {
        throw new Error("This browser cannot create WebP portraits");
      }
      if (output.size <= CHARACTER_PORTRAIT_TARGET_BYTES) break;

      if (quality > 0.62) {
        quality -= 0.1;
      } else {
        dimensions = constrainedImageSize(
          Math.round(dimensions.width * 0.82),
          Math.round(dimensions.height * 0.82),
          CHARACTER_PORTRAIT_MAX_EDGE
        );
      }
    }

    if (!output) throw new Error("Could not optimize the portrait");
    return output;
  } finally {
    drawable.release();
  }
};
