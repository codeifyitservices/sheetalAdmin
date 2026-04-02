const gcd = (a, b) => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
};

export const formatAspectRatio = (width, height) => {
  if (!width || !height) return "";
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
};

export const getImageDimensions = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      const { width, height } = img;
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read "${file.name}".`));
    };

    img.src = objectUrl;
  });

export const getVideoDimensions = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      const { videoWidth, videoHeight } = video;
      URL.revokeObjectURL(objectUrl);
      resolve({ width: videoWidth, height: videoHeight });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read "${file.name}".`));
    };

    video.src = objectUrl;
  });

// Aspect-ratio validation is intentionally disabled globally.
// Keep the helpers so existing callers can still verify files are readable.
export const validateImageAspectRatio = async (
  file,
  _expectedDimensions,
  _options = {},
) => getImageDimensions(file);

export const getImageAspectRatioWarning = async (
  file,
  _expectedDimensions,
  _options = {},
) => {
  await getImageDimensions(file);
  return null;
};

export const getRatioLabel = (width, height) => formatAspectRatio(width, height);

export const validateVideoAspectRatio = async (
  file,
  _expectedDimensions,
  _options = {},
) => getVideoDimensions(file);
