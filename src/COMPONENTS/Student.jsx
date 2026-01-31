import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, AlertCircle, Zap, Play } from 'lucide-react';

const API_BASE = 'https://a8066c847fbb.ngrok-free.app';

function Student() {
    const [page, setPage] = useState('home');
    const [formData, setFormData] = useState({});
    const [capturedImages, setCapturedImages] = useState([]);
    const [stream, setStream] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [notification, setNotification] = useState(null);
    const [videoReady, setVideoReady] = useState(false);
    const [showDataModal, setShowDataModal] = useState(false);
    const [students, setStudents] = useState([]);

    // Training states
    const [isTraining, setIsTraining] = useState(false);
    const [trainingResult, setTrainingResult] = useState(null);

    // Recognition states
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [recognitionResult, setRecognitionResult] = useState(null);
    const [teacherId, setTeacherId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [section, setSection] = useState('');
    const [semester, setSemester] = useState('');
    const [activeSession, setActiveSession] = useState(null);

    // Analysis states
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [analysisSectionInput, setAnalysisSectionInput] = useState('');
    const [analysisSemesterInput, setAnalysisSemesterInput] = useState('');

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const recognitionIntervalRef = useRef(null);

    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (recognitionIntervalRef.current) {
                clearInterval(recognitionIntervalRef.current);
            }
        };
    }, [stream]);

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const startCamera = async () => {
        try {
            console.log('Starting camera...');
            setVideoReady(false);
            setIsCapturing(true);

            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

            setStream(mediaStream);
            await new Promise(resolve => setTimeout(resolve, 100));

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                try {
                    await videoRef.current.play();
                } catch (playErr) {
                    console.log('Play error:', playErr);
                }

                setTimeout(() => {
                    setVideoReady(true);
                    showNotification('Camera started successfully', 'success');
                }, 500);
            }
        } catch (err) {
            console.error('Camera error:', err);
            let errorMsg = 'Camera error: ';

            if (err.name === 'NotAllowedError') {
                errorMsg += 'Please allow camera permissions.';
            } else if (err.name === 'NotFoundError') {
                errorMsg += 'No camera found.';
            } else if (err.name === 'NotReadableError') {
                errorMsg += 'Camera is in use by another application.';
            } else {
                errorMsg += err.message || 'Unknown error.';
            }

            showNotification(errorMsg, 'error');
            setIsCapturing(false);
            setVideoReady(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        if (recognitionIntervalRef.current) {
            clearInterval(recognitionIntervalRef.current);
            recognitionIntervalRef.current = null;
        }
        setIsCapturing(false);
        setIsRecognizing(false);
        setVideoReady(false);
    };

    const captureImage = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && videoReady) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);

            canvas.toBlob(blob => {
                if (blob) {
                    setCapturedImages(prev => [...prev, blob]);
                    showNotification(`Image ${capturedImages.length + 1} captured`, 'success');
                }
            }, 'image/jpeg', 0.95);
        } else {
            showNotification('Video not ready. Please wait...', 'error');
        }
    };

    const handleSubmitRegistration = async () => {
        if (capturedImages.length < 5) {
            showNotification('Please capture at least 5 images', 'error');
            return;
        }

        const branch = formData.branch || 'CSE';

        if (!formData.name || !formData.enrollNumber || !formData.section || !formData.year) {
            showNotification('Please fill all required fields (Name, Enrollment Number, Section, Semester)', 'error');
            return;
        }

        const form = new FormData();
        form.append('name', formData.name);
        form.append('enrollment_number', formData.enrollNumber);
        form.append('section', formData.section);
        form.append('year', formData.year);
        form.append('branch', branch);

        if (formData.email) form.append('email', formData.email);
        if (formData.mobile) form.append('mobile', formData.mobile);
        if (formData.fees) form.append('fees', formData.fees);

        capturedImages.forEach((blob, idx) => {
            form.append('images', blob, `image_${idx}.jpg`);
        });

        try {
            showNotification('Registering... Please wait', 'info');
            const response = await fetch(`${API_BASE}/register/student`, {
                method: 'POST',
                body: form
            });

            const result = await response.json();

            if (response.ok) {
                showNotification('Student registered successfully!', 'success');
                setTimeout(() => {
                    setPage('home');
                    resetForm();
                }, 2000);
            } else {
                showNotification(result.detail || 'Registration failed', 'error');
            }
        } catch (err) {
            console.error('Registration error:', err);
            showNotification('Network error. Please try again.', 'error');
        }
    };

    const resetForm = () => {
        setFormData({});
        setCapturedImages([]);
        stopCamera();
    };

    const fetchStudents = async () => {
        try {
            const response = await fetch(`${API_BASE}/debug/students`);
            const data = await response.json();
            setStudents(data.students || []);
            setShowDataModal(true);
        } catch (err) {
            showNotification('Failed to fetch students', 'error');
        }
    };

    // Train Model Function
    const handleTrainModel = async () => {
        if (!section || !semester) {
            showNotification('Please enter Section and Semester to train model', 'error');
            return;
        }

        setIsTraining(true);
        setTrainingResult(null);
        showNotification('Training model... This may take a few minutes', 'info');

        try {
            const form = new FormData();
            form.append('section', section);
            form.append('year', semester);

            const response = await fetch(`${API_BASE}/train`, {
                method: 'POST',
                body: form
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setTrainingResult(result);
                showNotification(`Model trained successfully! ${result.students_trained || 0} students trained`, 'success');
            } else {
                showNotification(result.detail || 'Training failed', 'error');
            }
        } catch (err) {
            console.error('Training error:', err);
            showNotification('Failed to train model', 'error');
        } finally {
            setIsTraining(false);
        }
    };

    // Attendance functions
    const startAttendanceSession = async () => {
        if (!teacherId || !subjectId || !section || !semester) {
            showNotification('Please fill Teacher ID, Subject ID, Section, and Semester', 'error');
            return;
        }

        try {
            const form = new FormData();
            form.append('teacher_id', teacherId);
            form.append('subject_id', subjectId);
            form.append('section', section);
            form.append('semester', semester);
            form.append('class_name', `${section}-${semester}`);
            form.append('duration_minutes', '60');

            const response = await fetch(`${API_BASE}/attendance/start-session`, {
                method: 'POST',
                body: form
            });

            const result = await response.json();

            if (response.ok) {
                setActiveSession(result.session);
                showNotification('Attendance session started!', 'success');
                startRecognition();
            } else {
                showNotification(result.detail || 'Failed to start session', 'error');
            }
        } catch (err) {
            console.error('Start session error:', err);
            showNotification('Failed to start attendance session', 'error');
        }
    };

    const startRecognition = async () => {
        try {
            if (!isCapturing) {
                await startCamera();
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            setIsRecognizing(true);
            showNotification('Recognition started', 'success');

            if (recognitionIntervalRef.current) {
                clearInterval(recognitionIntervalRef.current);
            }

            recognitionIntervalRef.current = setInterval(async () => {
                const video = videoRef.current;
                const canvas = canvasRef.current;

                if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && videoReady && activeSession) {
                    try {
                        const captureCanvas = document.createElement('canvas');
                        captureCanvas.width = video.videoWidth;
                        captureCanvas.height = video.videoHeight;
                        const captureCtx = captureCanvas.getContext('2d');
                        captureCtx.drawImage(video, 0, 0);

                        captureCanvas.toBlob(async blob => {
                            if (blob) {
                                const form = new FormData();
                                form.append('image', blob, 'test.jpg');
                                form.append('section', section);
                                form.append('year', semester);

                                try {
                                    const response = await fetch(`${API_BASE}/attendance/recognize-and-mark`, {
                                        method: 'POST',
                                        body: form
                                    });

                                    if (response.ok) {
                                        const result = await response.json();

                                        if (result.success) {
                                            const transformedResult = {
                                                match: true,
                                                name: result.recognition.name,
                                                enrollment_number: result.recognition.id,
                                                confidence: result.recognition.confidence,
                                                status: result.status
                                            };
                                            setRecognitionResult(transformedResult);

                                            const overlayCanvas = canvasRef.current;
                                            if (overlayCanvas) {
                                                overlayCanvas.width = video.videoWidth;
                                                overlayCanvas.height = video.videoHeight;
                                                const ctx = overlayCanvas.getContext('2d');
                                                drawFaceBox(ctx, video, transformedResult);
                                            }

                                            showNotification(`${transformedResult.name} marked ${transformedResult.status}`, 'success');
                                        }
                                    }
                                } catch (err) {
                                    console.error('Recognition request error:', err);
                                }
                            }
                        }, 'image/jpeg', 0.8);
                    } catch (err) {
                        console.error('Canvas error:', err);
                    }
                }
            }, 3000);
        } catch (error) {
            console.error('Recognition start error:', error);
            showNotification('Failed to start recognition', 'error');
            setIsRecognizing(false);
        }
    };

    const stopRecognition = () => {
        if (recognitionIntervalRef.current) {
            clearInterval(recognitionIntervalRef.current);
            recognitionIntervalRef.current = null;
        }
        setIsRecognizing(false);
        setRecognitionResult(null);
        stopCamera();
        showNotification('Recognition stopped', 'info');
    };

    const drawFaceBox = (ctx, video, result) => {
        if (!result || !result.match) return;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        const boxWidth = video.videoWidth * 0.4;
        const boxHeight = video.videoHeight * 0.5;
        const boxX = (video.videoWidth - boxWidth) / 2;
        const boxY = (video.videoHeight - boxHeight) / 2 - video.videoHeight * 0.05;

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

        const labelHeight = 100;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
        ctx.fillRect(boxX, boxY - labelHeight, boxWidth, labelHeight);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';

        const textX = boxX + 10;
        ctx.fillText(result.name, textX, boxY - labelHeight + 25);
        ctx.font = '16px Arial';
        ctx.fillText(result.enrollment_number, textX, boxY - labelHeight + 50);
        ctx.fillText(`Confidence: ${(result.confidence * 100).toFixed(1)}%`, textX, boxY - labelHeight + 72);
        ctx.fillText(`Status: ${result.status}`, textX, boxY - labelHeight + 94);
    };

    const NotificationBanner = () => {
        if (!notification) return null;
        return (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-100 text-green-800' :
                notification.type === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                }`}>
                {notification.type === 'success' ? <CheckCircle size={20} /> :
                    notification.type === 'error' ? <XCircle size={20} /> :
                        <AlertCircle size={20} />}
                {notification.message}
            </div>
        );
    };

    // Home Page (Student Data Form)
    if (page === 'home') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
                <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold text-blue-600">Student Data</h2>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setPage('capture'); startCamera(); }}
                                disabled={!formData.name || !formData.enrollNumber}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                Add Student
                            </button>
                            <button
                                onClick={fetchStudents}
                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                            >
                                Show Data
                            </button>
                        </div>
                    </div>

                    <NotificationBanner />

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Enrollment Number</label>
                            <input
                                type="text"
                                value={formData.enrollNumber || ''}
                                onChange={e => setFormData({ ...formData, enrollNumber: e.target.value })}
                                placeholder="Enrollment Number"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Name"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Email</label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="Email"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Mobile Number</label>
                            <input
                                type="tel"
                                value={formData.mobile || ''}
                                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                placeholder="Mobile Number"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Semester</label>
                            <input
                                type="text"
                                value={formData.year || ''}
                                onChange={e => setFormData({ ...formData, year: e.target.value })}
                                placeholder="Semester"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Fees</label>
                            <input
                                type="number"
                                value={formData.fees || ''}
                                onChange={e => setFormData({ ...formData, fees: e.target.value })}
                                placeholder="Fees"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Branch</label>
                            <select
                                value={formData.branch || 'CSE'}
                                onChange={e => setFormData({ ...formData, branch: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="CSE">CSE</option>
                                <option value="IT">IT</option>
                                <option value="ECE">ECE</option>
                                <option value="ME">ME</option>
                                <option value="CE">CE</option>
                                <option value="EE">EE</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Section</label>
                            <input
                                type="text"
                                value={formData.section || ''}
                                onChange={e => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                                placeholder="Section"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="mt-8">
                        <button
                            onClick={() => setPage('recognition')}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center justify-center gap-2"
                        >
                            <Camera size={24} />
                            Face Recognition Test
                        </button>
                    </div>

                    <div className="mt-4">
                        <button
                            onClick={() => setFormData({})}
                            className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                {showDataModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-auto p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-2xl font-bold text-gray-800">Student Data</h3>
                                <button
                                    onClick={() => setShowDataModal(false)}
                                    className="text-gray-500 hover:text-gray-700 text-2xl"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2 text-left">Enrollment</th>
                                            <th className="border p-2 text-left">Name</th>
                                            <th className="border p-2 text-left">Email</th>
                                            <th className="border p-2 text-left">Section</th>
                                            <th className="border p-2 text-left">Semester</th>
                                            <th className="border p-2 text-left">Branch</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.length > 0 ? students.map((student, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="border p-2">{student.enrollment_number}</td>
                                                <td className="border p-2">{student.name}</td>
                                                <td className="border p-2">{student.email}</td>
                                                <td className="border p-2">{student.section}</td>
                                                <td className="border p-2">{student.semester}</td>
                                                <td className="border p-2">{student.branch}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="6" className="border p-4 text-center text-gray-500">
                                                    No students found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    } // End home page

    // Camera Capture Page
    if (page === 'capture') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
                <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">Capture Face Images</h2>

                    <NotificationBanner />

                    <div className="mb-6 relative bg-black rounded-lg overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            controls={false}
                            className="w-full rounded-lg"
                            style={{ minHeight: '600px', maxHeight: '700px', objectFit: 'cover' }} // Increased size
                            onLoadedData={() => setVideoReady(true)}
                            onPlaying={() => setVideoReady(true)}
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {!videoReady && isCapturing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 rounded-lg">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                                    <p className="text-white text-lg">Initializing camera...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mb-4 text-center">
                        <p className="text-lg font-medium text-gray-700">
                            Images Captured: <span className="text-blue-600">{capturedImages.length}</span> / 10
                            <span className="text-sm text-gray-500 ml-2">(minimum 5 required)</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={captureImage}
                            disabled={!isCapturing || !videoReady}
                            className="bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            📸 Capture Image
                        </button>

                        <button
                            onClick={handleSubmitRegistration}
                            disabled={capturedImages.length < 5}
                            className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            ✅ Submit Registration
                        </button>
                    </div>

                    <button
                        onClick={() => { setPage('home'); stopCamera(); setCapturedImages([]); }}
                        className="w-full mt-4 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                    >
                        ← Back
                    </button>
                </div>
            </div>
        );
    } // End capture page

    // Recognition Page
    if (page === 'recognition') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
                <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Camera size={32} />
                        Face Recognition System
                    </h2>

                    <NotificationBanner />

                    {/* Training Section */}
                    <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border-2 border-purple-200">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Zap className="text-purple-600" size={24} />
                            Train Model
                        </h3>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-gray-700 font-medium mb-2">Section</label>
                                <input
                                    type="text"
                                    value={section}
                                    onChange={e => setSection(e.target.value.toUpperCase())}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    placeholder="e.g., A"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-medium mb-2">Semester</label>
                                <input
                                    type="number"
                                    value={semester}
                                    onChange={e => setSemester(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    placeholder="e.g., 7"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleTrainModel}
                            disabled={isTraining || !section || !semester}
                            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isTraining ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Training Model...
                                </>
                            ) : (
                                <>
                                    <Zap size={20} />
                                    Train Model
                                </>
                            )}
                        </button>

                        {trainingResult && (
                            <div className="mt-4 p-4 bg-green-100 rounded-lg border border-green-300">
                                <p className="text-green-800 font-semibold">✓ Training Completed</p>
                                <p className="text-green-700 text-sm mt-1">Students trained: {trainingResult.students_trained || 0}</p>
                            </div>
                        )}
                    </div>

                    {!activeSession && (
                        <div className="mb-6 space-y-4 bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-xl font-semibold text-gray-700 mb-4">Start Attendance Session</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">Teacher ID</label>
                                    <input
                                        type="text"
                                        value={teacherId}
                                        onChange={e => setTeacherId(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., T001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">Subject ID</label>
                                    <input
                                        type="number"
                                        value={subjectId}
                                        onChange={e => setSubjectId(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., 1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">Section</label>
                                    <input
                                        type="text"
                                        value={section}
                                        onChange={e => setSection(e.target.value.toUpperCase())}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., A"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">Semester</label>
                                    <input
                                        type="number"
                                        value={semester}
                                        onChange={e => setSemester(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., 7"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {!isRecognizing ? (
                        <button
                            onClick={startAttendanceSession}
                            disabled={!teacherId || !subjectId || !section || !semester}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed mb-6"
                        >
                            🎥 Start Recognition
                        </button>
                    ) : (
                        <button
                            onClick={stopRecognition}
                            className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold mb-6"
                        >
                            ⏹️ Stop Recognition
                        </button>
                    )}

                    {isCapturing && (
                        <div className="mb-6">
                            <div className="relative bg-gray-900 rounded-lg overflow-hidden mx-auto" style={{ paddingBottom: '56.25%', maxWidth: '900px', maxHeight: '700px' }}>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    controls={false}
                                    className="absolute inset-0 w-full h-full"
                                    style={{ objectFit: 'cover', height: '700px' }}
                                    onLoadedData={() => setVideoReady(true)}
                                    onPlaying={() => setVideoReady(true)}
                                />
                                <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 w-full h-full pointer-events-none"
                                    style={{ objectFit: 'cover', height: '700px' }}
                                />

                                {!videoReady && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                                        <div className="text-center">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                                            <p className="text-white text-lg">Starting camera...</p>
                                        </div>
                                    </div>
                                )}

                                {isRecognizing && !recognitionResult && videoReady && (
                                    <div className="absolute top-4 left-4 right-4">
                                        <div className="px-6 py-3 rounded-lg font-semibold bg-blue-500 text-white text-center animate-pulse">
                                            🔍 Scanning for faces...
                                        </div>
                                    </div>
                                )}

                                {videoReady && (
                                    <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black bg-opacity-50 px-3 py-2 rounded-full">
                                        <div className="bg-green-500 rounded-full w-2 h-2 animate-pulse"></div>
                                        <span className="text-white text-xs">Live</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!isCapturing && (
                        <div className="mb-6 bg-gray-100 rounded-lg p-12 text-center">
                            <Camera size={64} className="mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-600 text-lg">Camera inactive</p>
                            <p className="text-gray-500 text-sm mt-2">Click "Start Recognition" to begin</p>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            stopCamera();
                            stopRecognition();
                            setPage('home');
                            setActiveSession(null);
                        }}
                        className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                    >
                        🏠 Back to Home
                    </button>
                </div>
            </div>
        );
    } // End recognition page

    return null;
}

export default Student;
