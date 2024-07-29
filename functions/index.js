const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require("@google/generative-ai");
const sharp = require('sharp');
const os = require('os');
const path = require('path');
const fs = require('fs');
const Busboy = require('busboy');
const cors = require('cors');
const { initializeApp } = require('firebase-admin/app');
const { getAppCheck } = require('firebase-admin/app-check');

initializeApp();

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

exports.analyzeImage = onRequest({cors:["https://learninggemini-947bf.web.app"]}, async (req, res) => {

    // Verify the App Check token
    const appCheckToken = req.header('X-Firebase-AppCheck');
    if (!appCheckToken) {
        return res.status(401).json({ error: "Unauthorized: Missing App Check token" });
    }
    
    try {
        await getAppCheck().verifyToken(appCheckToken);
    } catch (error) {
        console.error("Error verifying App Check token:", error);
        return res.status(401).json({ error: "Unauthorized: Invalid App Check token" });
    }

    cors({
        origin: 'https://learninggemini-947bf.web.app',
        methods: ['POST'],
        credentials: true,
    })(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).end();
        }

        const busboy = Busboy({ headers: req.headers });
        let imageBuffer;
        let imageFileName;
        let personalityTraits = [];
        let favoriteSubjects = [];
        let excludedJobs = [];

        busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
            if (fieldname !== 'image') {
                file.resume();
                return;
            }

            const chunks = [];
            file.on('data', (chunk) => chunks.push(chunk));
            file.on('end', () => {
                imageBuffer = Buffer.concat(chunks);
                imageFileName = filename;
            });
        });

        busboy.on('field', (fieldname, val) => {
            if (fieldname === 'personality') {
                personalityTraits = JSON.parse(val);
            } else if (fieldname === 'subjects') {
                favoriteSubjects = JSON.parse(val);
            } else if (fieldname === 'excludedJobs') {
                excludedJobs = JSON.parse(val);
            }
        });

        busboy.on('finish', async () => {
            if (!imageBuffer) {
                return res.status(400).json({ error: "No image file uploaded" });
            }

            try {
                // Process the image using Sharp
                const processedImageBuffer = await sharp(imageBuffer)
                    .resize(512, 512)
                    .jpeg()
                    .toBuffer();
                
                // Create a temporary file path
                const tempFilePath = path.join(os.tmpdir(), `image_${Date.now()}.jpg`);

                // Save the processed image to the temporary file
                fs.writeFileSync(tempFilePath, processedImageBuffer);

                // Converts local file information to a GoogleGenerativeAI.Part object.
                function fileToGenerativePart(path, mimeType) {
                    return {
                        inlineData: {
                            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
                            mimeType
                        },
                    };
                }
                
                // Turn images to Part objects
                const filePart = fileToGenerativePart(tempFilePath, "image/jpeg")
                const imageParts = [filePart];

                // Prepare the prompt for Gemini
                const prompt = `Based on the provided image, personality traits (${personalityTraits.join(', ')}), and favorite subjects (${favoriteSubjects.join(', ')}), recommend three suitable career paths. 
                ${excludedJobs.length > 0 ? `Please exclude the following jobs from your recommendations: ${excludedJobs.join(', ')}.` : ''}
                For each career, provide the following information:

                1. Job name
                2. Reason for recommendation (based on the image, personality traits, and favorite subjects)
                3. Required education
                4. Typical curriculum
                5. Type of degree needed
                6. Recommended schools offering relevant programs
                7. Subjects the user should focus on
                8. Required licenses or certifications (if any)

                Also, provide a brief summary of the recommendations.

                Format the response as a JSON object with the following structure:
                {
                    "job1": {
                        "name": "",
                        "reason_for_recommendation": "",
                        "required_education": "",
                        "curriculum": "",
                        "degree": "",
                        "recommended_schools": "",
                        "subjects_to_study": "",
                        "license": ""
                    },
                    "job2": {
                        // Same structure as job1
                    },
                    "job3": {
                        // Same structure as job1
                    },
                    "summary": ""
                }`;

                const model = genAI.getGenerativeModel({
                    model: 'gemini-1.5-pro',
                    safetySetting: [
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_UNSPECIFIED, threshold: HarmBlockThreshold.BLOCK_NONE },
                    ],
                    generationConfig: { responseMimeType: "application/json" }
                });

                const result = await model.generateContent([prompt, ...imageParts]);
                const response = await result.response;
                const text = response.text();
                
                // Clean up the temporary file
                fs.unlinkSync(tempFilePath);

                // Return the structured response
                res.status(200).json(JSON.parse(text));

            } catch (error) {
                console.error("Error analyzing image:", error);
                res.status(500).json({ error: "Internal Server Error" });
            }
        });

        busboy.end(req.rawBody);
    });
});