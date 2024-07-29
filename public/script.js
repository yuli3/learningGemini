// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-analytics.js";
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app-check.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAsSLZKvgp2MG_9Ymu9_ax4eJczZZmRxhE",
  authDomain: "learninggemini-947bf.firebaseapp.com",
  projectId: "learninggemini-947bf",
  storageBucket: "learninggemini-947bf.appspot.com",
  messagingSenderId: "382107226874",
  appId: "1:382107226874:web:654d145b7150493e3aef43",
  measurementId: "G-BF542L30WB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize App Check
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LcRsRoqAAAAAPTUc1KvSKq1-ubEa5oaBS_BLLmN'),
  isTokenAutoRefreshEnabled: true
});

// Personality traits and subjects lists
const personalityTraits = [
    "Creative", "Analytical", "Outgoing", "Detail-oriented", "Leadership",
    "Adaptable", "Innovative", "Empathetic", "Logical", "Ambitious",
    "Patient", "Confident", "Collaborative", "Independent", "Organized"
];

const schoolSubjects = [
    "Math", "Science", "Literature", "History", "Art",
    "Painting", "Drama", "English", "Geography", "Sports",
    "Physics", "Chemistry", "Biology", "Computer Science", "Economics",
    "Psychology", "Sociology", "Foreign Languages", "Music", "Education"
];

let selectedPersonality = [];
let selectedSubjects = [];
let excludedJobs = [];

// DOM elements
const dropZone = document.getElementById('dropZone');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const personalitySelect = document.getElementById('personalitySelect');
const subjectsSelect = document.getElementById('subjectsSelect');
const analyzeButton = document.getElementById('analyzeButton');
const loadingDiv = document.getElementById('loading');
const resultDiv = document.getElementById('result');
const moreRecommendationsButton = document.getElementById('moreRecommendations');

// Initialize multiselect components
function initializeMultiSelect(element, options, selectedArray) {
    element.innerHTML = '';
    options.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.classList.add('option');
        optionElement.textContent = option;
        optionElement.addEventListener('click', () => {
            if (selectedArray.includes(option)) {
                selectedArray = selectedArray.filter(item => item !== option);
                optionElement.classList.remove('selected');
            } else {
                selectedArray.push(option);
                optionElement.classList.add('selected');
            }
        });
        element.appendChild(optionElement);
    });
    return selectedArray;
}

selectedPersonality = initializeMultiSelect(personalitySelect, personalityTraits, selectedPersonality);
selectedSubjects = initializeMultiSelect(subjectsSelect, schoolSubjects, selectedSubjects);

// Drag and drop functionality
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    handleImageUpload(file);
});

dropZone.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    handleImageUpload(file);
});

function handleImageUpload(file) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        alert('Please select a valid image file.');
    }
}

// Analyze button click handler
analyzeButton.addEventListener('click', async () => {

    if (!imageInput.files || imageInput.files.length === 0) {
        alert('Please select an image file.');
        return;
    }

    if (selectedPersonality.length === 0 || selectedSubjects.length === 0) {
        alert('Please select at least one personality trait and one favorite subject.');
        return;
    }

    loadingDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    moreRecommendationsButton.style.display = 'none';

    try {
        const recommendations = await getRecommendations();
        displayResults(recommendations);
        moreRecommendationsButton.style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        resultDiv.innerHTML = 'An error occurred while analyzing the image: ' + error.message;
    } finally {
        loadingDiv.style.display = 'none';
        resultDiv.style.display = 'block';
    }
});

// Get recommendations from Firebase function
async function getRecommendations() {
    const appCheckToken = await getToken(appCheck,false);

    const formData = new FormData();
    formData.append('image', imageInput.files[0]);
    formData.append('personality', JSON.stringify(selectedPersonality));
    formData.append('subjects', JSON.stringify(selectedSubjects));
    formData.append('excludedJobs', JSON.stringify(excludedJobs));
    

    const response = await fetch('https://analyzeimage-vtcr4uim3q-uc.a.run.app', {
        method: 'POST',
        body: formData,
        mode: 'cors',
        headers: {
            'X-Firebase-AppCheck': appCheckToken.token
        },
    });

    if (!response.ok) {
        throw new Error('Network response was not ok: ' + response.statusText);
    }

    return await response.json();
}

// Display results
function displayResults(data) {
    let resultHTML = '<h2>Career Recommendations</h2>';

    for (let i = 1; i <= 3; i++) {
        const job = data[`job${i}`];
        resultHTML += `
            <div class="job-recommendation">
                <h3>${job.name}</h3>
                <p><strong>Why it suits you:</strong> ${job.reason_for_recommendation}</p>
                <p><strong>Required Education:</strong> ${job.required_education}</p>
                <p><strong>Typical Curriculum:</strong> ${job.curriculum}</p>
                <p><strong>Degree Needed:</strong> ${job.degree}</p>
                <p><strong>Recommended Schools:</strong> ${job.recommended_schools}</p>
                <p><strong>Subjects to Focus On:</strong> ${job.subjects_to_study}</p>
                <p><strong>Required Licenses/Certifications:</strong> ${job.license}</p>
            </div>
        `;
        excludedJobs.push(job.name);
    }

    resultHTML += `<div><strong>Summary:</strong> ${data.summary}</div>`;

    resultDiv.innerHTML = resultHTML;
}

// More recommendations button click handler
moreRecommendationsButton.addEventListener('click', async () => {
    loadingDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    moreRecommendationsButton.style.display = 'none';

    try {
        const recommendations = await getRecommendations();
        displayResults(recommendations);
    } catch (error) {
        console.error('Error:', error);
        resultDiv.innerHTML += '<p>An error occurred while fetching more recommendations: ' + error.message + '</p>';
    } finally {
        loadingDiv.style.display = 'none';
        moreRecommendationsButton.style.display = 'block';
    }
});