import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// Change this to localhost instead of 0.0.0.0
const API_BASE = 'https://37f157ea0d3c.ngrok-free.app';

function Teacher() {
  const [page, setPage] = useState('home');
  const [formData, setFormData] = useState({});
  const [capturedImages, setCapturedImages] = useState([]);
  const [stream, setStream] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [teachers, setTeachers] = useState([]);
  
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState(null);

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
        video: { width: 1280, height: 720 },
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
          if (isRecognizing) {
            performRecognitionOnce(blob);
          } else {
            setCapturedImages(prev => [...prev, blob]);
            showNotification(`Image ${capturedImages.length + 1} captured`, 'success');
          }
        }
      }, 'image/jpeg', 0.95);
    } else {
      showNotification('Video not ready. Please wait...', 'error');
    }
  };

  const performRecognitionOnce = async (imageBlob) => {
    try {
      showNotification('Recognizing face...', 'info');

      const form = new FormData();
      form.append('image', imageBlob, 'capture.jpg');
      form.append('section', '');
      form.append('year', '');

      const response = await fetch(`${API_BASE}/test`, {
        method: 'POST',
        body: form
      });

      if (response.ok) {
        const result = await response.json();

        const transformedResult = {
          match: result.name !== 'Unknown',
          name: result.name,
          id: result.id || 'N/A',
          role: result.role,
          confidence: result.confidence || 0,
          message: result.message
        };

        setRecognitionResult(transformedResult);

        if (transformedResult.match) {
          showNotification(`✅ Recognized: ${result.name} (${(result.confidence * 100).toFixed(1)}%)`, 'success');
        } else {
          showNotification('❌ Face not recognized', 'error');
        }

        const video = videoRef.current;
        const overlayCanvas = canvasRef.current;
        if (overlayCanvas && video && video.readyState === video.HAVE_ENOUGH_DATA) {
          overlayCanvas.width = video.videoWidth;
          overlayCanvas.height = video.videoHeight;
          const ctx = overlayCanvas.getContext('2d');
          drawFaceBox(ctx, video, transformedResult);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Recognition failed:', errorData);
        showNotification('Recognition failed', 'error');
      }
    } catch (err) {
      console.error('Recognition error:', err);
      showNotification(`Recognition error: ${err.message}`, 'error');
    }
  };

  const handleSubmitRegistration = async () => {
    if (capturedImages.length < 5) {
      showNotification('Please capture at least 5 images', 'error');
      return;
    }

    if (!formData.name || !formData.teacherId) {
      showNotification('Please fill Teacher ID and Name', 'error');
      return;
    }

    const form = new FormData();
    form.append('name', formData.name);
    form.append('teacher_id', formData.teacherId);

    if (formData.phone) form.append('phone', formData.phone);
    if (formData.email) form.append('email', formData.email);
    if (formData.salary) form.append('salary', formData.salary);

    capturedImages.forEach((blob, idx) => {
      form.append('images', blob, `image_${idx}.jpg`);
    });

    try {
      showNotification('Registering teacher... Please wait', 'info');
      
      console.log('Sending registration request to:', `${API_BASE}/register/teacher`);
      console.log('Form data:', {
        name: formData.name,
        teacher_id: formData.teacherId,
        images: capturedImages.length
      });

      const response = await fetch(`${API_BASE}/register/teacher`, {
        method: 'POST',
        body: form
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);

      const result = await response.json();
      console.log('Response data:', result);

      if (response.ok) {
        showNotification('Teacher registered successfully!', 'success');
        setTimeout(() => {
          setPage('home');
          resetForm();
        }, 2000);
      } else {
        showNotification(result.detail || 'Registration failed', 'error');
      }
    } catch (err) {
      console.error('Registration error details:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      
      // More specific error messages
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        showNotification('Cannot connect to server. Make sure backend is running on http://localhost:8000', 'error');
      } else {
        showNotification(`Network error: ${err.message}`, 'error');
      }
    }
  };

  const resetForm = () => {
    setFormData({});
    setCapturedImages([]);
    stopCamera();
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch(`${API_BASE}/debug/teachers`);
      const data = await response.json();
      setTeachers(data.teachers || []);
      setShowDataModal(true);
    } catch (err) {
      console.error('Fetch teachers error:', err);
      showNotification('Failed to fetch teachers', 'error');
    }
  };

  const handleTrainModel = async () => {
    try {
      const formData = new URLSearchParams();
      formData.append('section', '');
      formData.append('year', '');

      showNotification('Training model... This may take a minute', 'info');

      const response = await fetch(`${API_BASE}/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      const result = await response.json();

      if (response.ok) {
        showNotification(`Model trained! ${result.students_trained || 0} students`, 'success');
      } else {
        showNotification(result.detail || 'Training failed', 'error');
      }
    } catch (err) {
      console.error('Training error:', err);
      showNotification('Training error. Check console for details.', 'error');
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

        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && videoReady) {
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
                form.append('section', '');
                form.append('year', '');

                try {
                  const response = await fetch(`${API_BASE}/test`, {
                    method: 'POST',
                    body: form
                  });

                  if (response.ok) {
                    const result = await response.json();

                    const transformedResult = {
                      match: result.name !== 'Unknown',
                      name: result.name,
                      id: result.id || 'N/A',
                      role: result.role,
                      confidence: result.confidence || 0,
                      message: result.message
                    };
                    setRecognitionResult(transformedResult);

                    const overlayCanvas = canvasRef.current;
                    if (overlayCanvas) {
                      overlayCanvas.width = video.videoWidth;
                      overlayCanvas.height = video.videoHeight;
                      const ctx = overlayCanvas.getContext('2d');
                      drawFaceBox(ctx, video, transformedResult);
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
      }, 2000);
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
    if (!result || !result.match) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      return;
    }

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const boxWidth = video.videoWidth * 0.5;
    const boxHeight = video.videoHeight * 0.6;
    const boxX = (video.videoWidth - boxWidth) / 2;
    const boxY = (video.videoHeight - boxHeight) / 2 - video.videoHeight * 0.05;

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    const labelHeight = 90;
    const labelY = boxY - labelHeight - 5;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
    ctx.fillRect(boxX, labelY, boxWidth, labelHeight);

    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';

    const textX = boxX + 15;
    const lineHeight = 28;

    ctx.font = 'bold 24px Arial';
    ctx.fillText(result.name, textX, labelY + lineHeight);

    ctx.font = '18px Arial';
    ctx.fillText(`ID: ${result.id}`, textX, labelY + lineHeight * 2);

    ctx.fillText(`Role: ${result.role}`, textX, labelY + lineHeight * 3);

    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${(result.confidence * 100).toFixed(1)}%`, boxX + boxWidth - 15, labelY + lineHeight * 3);
  };

  const NotificationBanner = () => {
    if (!notification) return null;
    return (
      <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
        notification.type === 'success' ? 'bg-green-100 text-green-800' :
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

  if (page === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
        <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-green-600">Teacher Data</h2>
            <div className="flex gap-3">
              <button
                onClick={() => { setPage('capture'); startCamera(); }}
                disabled={!formData.name || !formData.teacherId}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Add Teacher
              </button>
              <button
                onClick={fetchTeachers}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Show Data
              </button>
            </div>
          </div>

          <NotificationBanner />

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Teacher ID *</label>
              <input
                type="text"
                value={formData.teacherId || ''}
                onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                placeholder="Teacher ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Name *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Salary</label>
              <input
                type="text"
                value={formData.salary || ''}
                onChange={e => setFormData({ ...formData, salary: e.target.value })}
                placeholder="Salary"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                <h3 className="text-2xl font-bold text-gray-800">Teacher Data</h3>
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
                      <th className="border p-2 text-left">Teacher ID</th>
                      <th className="border p-2 text-left">Name</th>
                      <th className="border p-2 text-left">Phone</th>
                      <th className="border p-2 text-left">Email</th>
                      <th className="border p-2 text-left">Salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.length > 0 ? teachers.map((teacher, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border p-2">{teacher.teacher_id}</td>
                        <td className="border p-2">{teacher.teacher_name}</td>
                        <td className="border p-2">{teacher.phone_number || '-'}</td>
                        <td className="border p-2">{teacher.email || '-'}</td>
                        <td className="border p-2">{teacher.salary || '-'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5" className="border p-4 text-center text-gray-500">
                          No teachers found
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
  }

  if (page === 'capture') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
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
              style={{ minHeight: '600px', maxHeight: '700px', objectFit: 'cover' }}
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
              Images Captured: <span className="text-green-600">{capturedImages.length}</span> / 10
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
  }

  if (page === 'recognition') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Camera size={32} />
            Face Recognition Test
          </h2>

          <NotificationBanner />

          <div className="mb-6 bg-gray-50 p-6 rounded-lg">
            <button
              onClick={handleTrainModel}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              🎯 Train Model
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {!isRecognizing ? (
              <button
                onClick={startRecognition}
                className="col-span-2 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
              >
                🎥 Start Recognition
              </button>
            ) : (
              <>
                <button
                  onClick={captureImage}
                  disabled={!videoReady}
                  className="bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  📸 Capture
                </button>
                <button
                  onClick={stopRecognition}
                  className="bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  ⏹️ Stop
                </button>
              </>
            )}
          </div>

          {isCapturing && (
            <div className="mb-6">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden mx-auto" style={{ maxWidth: '900px' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  controls={false}
                  className="w-full"
                  style={{ objectFit: 'cover', maxHeight: '700px' }}
                  onLoadedData={() => setVideoReady(true)}
                  onPlaying={() => setVideoReady(true)}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ objectFit: 'cover' }}
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
            }}
            className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
          >
            🏠 Back to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default Teacher;