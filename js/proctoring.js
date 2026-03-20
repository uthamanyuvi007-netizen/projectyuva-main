// ========================================
// Proctoring with Face Detection
// Uses face-api.js for real-time face/eye tracking
// ========================================

// Global variables for proctoring
let faceDetectionActive = false;
let detectionInterval = null;
let warningCount = 0;
let lastFaceDetected = true;
let faceNotDetectedDuration = 0;
let multipleFacesDetected = false;

// Face detection settings
const DETECTION_INTERVAL = 1000; // Check every 1 second
const FACE_NOT_DETECTED_THRESHOLD = 30; // 30 seconds = warning

// Load face-api.js from CDN
async function loadFaceAPI() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Initialize face detection models
async function initFaceDetection() {
    try {
        await loadFaceAPI();

        // Load models from face-api.js CDN
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';

        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);

        console.log('Face detection models loaded successfully');
        return true;
    } catch (error) {
        console.error('Failed to load face detection:', error);
        return false;
    }
}

// Start face detection on video element
async function startFaceDetection(videoElement, onWarning) {
    if (faceDetectionActive) return;

    const modelsLoaded = await initFaceDetection();
    if (!modelsLoaded) {
        console.warn('Face detection models failed to load');
        return;
    }

    faceDetectionActive = true;
    warningCount = 0;

    const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.3
    });

    detectionInterval = setInterval(async () => {
        try {
            const detections = await faceapi.detectAllFaces(videoElement, options)
                .withFaceLandmarks()
                .withFaceExpressions();

            if (detections.length === 0) {
                // No face detected
                faceNotDetectedDuration += DETECTION_INTERVAL / 1000;

                if (faceNotDetectedDuration >= 5 && lastFaceDetected) {
                    lastFaceDetected = false;
                    onWarning('face_not_detected', `No face detected for ${Math.floor(faceNotDetectedDuration)} seconds`);
                }

                if (faceNotDetectedDuration >= FACE_NOT_DETECTED_THRESHOLD) {
                    onWarning('face_missing', 'Warning: No face detected for extended period!');
                }
            } else if (detections.length > 1) {
                // Multiple faces detected
                if (!multipleFacesDetected) {
                    multipleFacesDetected = true;
                    onWarning('multiple_faces', `Warning: ${detections.length} faces detected!`);
                }
            } else {
                // One face detected - check for eye tracking
                const detection = detections[0];
                const landmarks = detection.landmarks;

                // Reset counters
                faceNotDetectedDuration = 0;
                lastFaceDetected = true;
                multipleFacesDetected = false;

                // Check if looking away (based on facial landmarks)
                const leftEye = landmarks.getLeftEye();
                const rightEye = landmarks.getRightEye();
                const nose = landmarks.getNose();
                const jaw = landmarks.getJawOutline();

                // Calculate face orientation
                const leftEyeCenter = getEyeCenter(leftEye);
                const rightEyeCenter = getEyeCenter(rightEye);
                const noseTip = nose[3];
                const faceWidth = jaw[16].x - jaw[0].x;

                // Check if looking away (simple heuristic)
                const eyeDistance = rightEyeCenter.x - leftEyeCenter.x;
                const noseX = noseTip.x;
                const faceCenter = jaw[0].x + faceWidth / 2;
                const offset = noseX - faceCenter;

                // If offset is too large, person might be looking away
                if (Math.abs(offset) > faceWidth * 0.15) {
                    warningCount++;
                    if (warningCount % 3 === 0) {
                        onWarning('looking_away', 'Warning: Please face the camera');
                    }
                }

                // Check for suspicious expressions
                const expressions = detection.expressions;
                if (expressions) {
                    if (expressions.neutral < 0.5 && expressions.surprised < 0.3) {
                        // Might be talking or suspicious
                    }
                }
            }
        } catch (error) {
            console.error('Face detection error:', error);
        }
    }, DETECTION_INTERVAL);
}

// Helper function to get eye center
function getEyeCenter(eye) {
    let x = 0, y = 0;
    eye.forEach(point => {
        x += point.x;
        y += point.y;
    });
    return { x: x / eye.length, y: y / eye.length };
}

// Stop face detection
function stopFaceDetection() {
    faceDetectionActive = false;
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
}

// Update status display
function updateProctoringStatus(elementId, status, message) {
    const element = document.getElementById(elementId);
    if (element) {
        const statusDot = element.querySelector('.status-dot');
        const statusText = element.querySelector('.status-dot + span') || element;

        if (status === 'normal') {
            element.style.borderColor = '#00C853';
            if (statusDot) statusDot.style.background = '#00C853';
        } else if (status === 'warning') {
            element.style.borderColor = '#d29922';
            if (statusDot) statusDot.style.background = '#d29922';
        } else if (status === 'danger') {
            element.style.borderColor = '#f85149';
            if (statusDot) statusDot.style.background = '#f85149';
        }

        if (message) {
            element.title = message;
        }
    }
}

// Export functions
export {
    loadFaceAPI,
    initFaceDetection,
    startFaceDetection,
    stopFaceDetection,
    updateProctoringStatus
};
