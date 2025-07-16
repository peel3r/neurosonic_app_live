// netlify/functions/neurosonic-proxy.js

// This function acts as a secure proxy to call the Gemini LLM API.
// It receives requests from the client-side React app,
// adds the securely stored API key, and forwards the request to Gemini.

// Node.js built-in fetch is used for making HTTP requests.
// This is automatically available in Netlify Functions.
const fetch = require('node-fetch');

// The main handler for the Netlify Function.
// 'event' contains information about the incoming HTTP request.
// 'context' contains information about the invocation, function, and deployment environment.
exports.handler = async (event, context) => {
    // 1. Enforce HTTP Method: Only allow POST requests to this function.
    // This ensures that the function is used as an API endpoint, not for direct browsing.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // 2. Retrieve API Key Securely:
    // The GEMINI_API_KEY is stored as an environment variable in your Netlify dashboard.
    // This is the crucial step for keeping your API key secret.
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // 3. Validate API Key Presence:
    // If the environment variable is not set, the function cannot proceed.
    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY environment variable is not set.");
        return { statusCode: 500, body: 'API Key not configured in Netlify Environment Variables.' };
    }

    try {
        // 4. Parse Request Body:
        // The client-side React app sends the prompt and the desired LLM model name in the request body.
        const { prompt, model } = JSON.parse(event.body);

        // 5. Construct Gemini API Payload:
        // This payload matches the format expected by the Gemini API for content generation.
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        };

        // 6. Define Gemini API URL:
        // The model name is dynamically inserted into the URL.
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

        // 7. Make the Secure Call to Gemini API:
        // This fetch request is made from the Netlify serverless environment,
        // so the GEMINI_API_KEY is never exposed to the client's browser.
        const response = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // 8. Handle Gemini API Errors:
        // If Gemini returns an error (e.g., 400, 403, 429), capture and forward it.
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error from Gemini API:", errorData); // Log the full error for debugging
            return {
                statusCode: response.status,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: errorData.error?.message || 'Error communicating with Gemini API' })
            };
        }

        // 9. Parse Gemini Response:
        // Get the successful response from Gemini.
        const result = await response.json();

        // 10. Return Response to Client:
        // Send the Gemini API's response back to the client-side React app.
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result)
        };

    } catch (error) {
        // 11. Handle Internal Function Errors:
        // Catch any errors that occur within the Netlify Function's execution.
        console.error("Error in Netlify Function (neurosonic-proxy):", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: error.message || 'Internal Server Error in proxy function' })
        };
    }
};
