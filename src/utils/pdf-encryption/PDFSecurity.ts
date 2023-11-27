const API_KEY = "asederado@gmail.com_704c914b6112e43ed51b0d7d3ecf11492ca26b21ab44ec4abd8ecb89818bcaa94f4bd6a9";
const MAX_RETRIES = 5; // maximum number of retries
const RETRY_INTERVAL = 1000; // initial retry interval in milliseconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, options: RequestInit, retries: number = MAX_RETRIES, interval: number = RETRY_INTERVAL): Promise<Response> => {
    try {
        const response = await fetch(url, options);
        if (!response.ok && response.status === 429 && retries > 0) {
            // Wait for a specific interval before retrying
            await sleep(interval);
            return fetchWithRetry(url, options, retries - 1, interval * 2); // Exponential backoff
        }
        return response;
    } catch (error) {
        if (retries > 0) {
            await sleep(interval);
            return fetchWithRetry(url, options, retries - 1, interval * 2);
        }
        throw error;
    }
};

export const getPresignedUrl = async (filename: string) => {
    const response = await fetchWithRetry(`https://api.pdf.co/v1/file/upload/get-presigned-url?name=${encodeURIComponent(filename)}&encrypt=true`, {
        method: 'GET',
        headers: { "x-api-key": API_KEY }
    });
    return await response.json();
};

export const uploadFile = async (presignedUrl: string, file: File) => {
    await fetchWithRetry(presignedUrl, {
        method: 'PUT',
        body: file
    });
};


export const addSecurityToPdf = async (fileUrl: string, filename: string, password: string) => {
    const jsonPayload = JSON.stringify({
        url: fileUrl,
        ownerPassword: password,
        userPassword: password,
        encryptionAlgorithm: "AES_128bit",
        // ... other parameters
    });

    const response = await fetchWithRetry(`https://api.pdf.co/v1/pdf/security/add`, {
        method: "POST",
        headers: {
            "x-api-key": API_KEY,
            "Content-Type": "application/json",
        },
        body: jsonPayload
    });

    const data = await response.json();
    if (!data.error) {
        downloadFile(data.url, filename);
    } else {
        console.log(data.message);
    }
};

export const downloadFile = (url: string, filename: string) => {
    fetch(url)
        .then(res => res.blob())
        .then(blob => {
            const fileURL = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = fileURL;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            URL.revokeObjectURL(fileURL);
            link.remove();
        });
};