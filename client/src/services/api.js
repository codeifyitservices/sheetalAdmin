// export const BASE_URL = "https://node.sheetal.codenap.in";
export const BASE_URL = "https://sheetaladmin.onrender.com";
// export const BASE_URL = "http://localhost:8000";

export const API_BASE_URL = `${BASE_URL}/api/v1`;

export const IMAGE_BASE_URL = BASE_URL;

export const getApiImageUrl = (
    path,
    fallback = "/assets/default-image.png"
) => {
    if (!path) return fallback;
    if (typeof path === "string") {
        if (path.startsWith("http")) return path;
        return `${IMAGE_BASE_URL}/${path.startsWith("/") ? path.substring(1) : path}`;
    }
    if (path.url) {
        return path.url;
    }
    return fallback;
};
