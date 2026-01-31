# Admin Panel

A React-based admin panel application for managing student and teacher attendance using facial recognition technology. This panel provides interface for student enrollment, teacher management, attendance tracking, and real-time facial recognition.

## 📋 Features

### Student Module
- **Student Registration**: Add new students with their details
- **Facial Recognition Training**: Capture and train facial recognition models for students
- **Attendance Marking**: Real-time facial recognition-based attendance
- **Data Management**: View and manage student records
- **Session Analytics**: Analyze attendance data by section and semester

### Teacher Module
- **Teacher Registration**: Add and manage teacher profiles
- **Teacher Recognition**: Identify teachers using facial recognition
- **Data Viewing**: View stored teacher information

## 🛠️ Technology Stack

- **Frontend Framework**: React 19.1.1
- **Build Tool**: Vite 7.1.7
- **Styling**: Tailwind CSS 3.4.18
- **Icons**: Lucide React 0.548.0
- **Linting**: ESLint 9.36.0
- **CSS Processing**: PostCSS 8.5.6

## 📦 Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Backend API**:
   - The application communicates with a Python backend via ngrok tunneling
   - Currently configured with ngrok URLs in `Student.jsx` and `Teacher.jsx`

## 🚀 Development

### Start Development Server
```bash
npm run dev
```
The application will run on `http://localhost:5173` by default.

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Lint Code
```bash
npm run lint
```

## 🔗 Backend API Integration

### Updating Ngrok Link

The admin panel connects to a Python backend through ngrok tunneling. When your ngrok session expires or you get a new tunnel, follow these steps to update the API endpoint:

#### Step 1: Update `Student.jsx`
- **File**: `src/COMPONENTS/Student.jsx`
- **Line**: 3
- **Current**: `const API_BASE = 'https://131218d5991a.ngrok-free.appp';`
- **Update To**: Replace with your new ngrok URL
  ```javascript
  const API_BASE = 'https://YOUR_NEW_NGROK_URL';
  ```

#### Step 2: Update `Teacher.jsx`
- **File**: `src/COMPONENTS/Teacher.jsx`
- **Line**: 5
- **Current**: `const API_BASE = 'https://131218d5991a.ngrok-free.app';`
- **Update To**: Replace with your new ngrok URL
  ```javascript
  const API_BASE = 'https://YOUR_NEW_NGROK_URL';
  ```

### Finding Your Ngrok URL

1. Start ngrok on your backend (Python) server:
   ```bash
   ngrok http 8000  # or your backend port
   ```

2. Look for the "Forwarding" URL in the terminal output:
   ```
   Forwarding                    https://XXXXXXXXXXXXX.ngrok-free.app -> http://localhost:8000
   ```

3. Copy the HTTPS URL (the one starting with `https://`) and use it to replace the `API_BASE` values

### API Endpoints

The backend provides the following endpoints used by this panel:

- **Student Operations**:
  - `POST /add_student` - Register a new student
  - `POST /train` - Train facial recognition model for a student
  - `POST /recognize` - Perform real-time facial recognition
  - `POST /analyze` - Analyze attendance data
  - `GET /get_students` - Retrieve list of students
  - `GET /get_data` - Get stored student data

- **Teacher Operations**:
  - `POST /add_teacher` - Register a new teacher
  - `POST /recognize_teacher` - Recognize teacher via facial recognition
  - `GET /get_teachers` - Retrieve list of teachers

## 🎥 Camera Requirements

- Ensure your device has a working camera/webcam
- Grant camera permissions when prompted by the browser
- Good lighting conditions recommended for accurate facial recognition

## 📝 Project Structure

```
Admin-panel/
├── src/
│   ├── COMPONENTS/
│   │   ├── Student.jsx      # Student management and recognition
│   │   └── Teacher.jsx      # Teacher management and recognition
│   ├── App.jsx              # Main application component
│   ├── main.jsx             # Application entry point
│   ├── App.css              # Application styles
│   ├── index.css            # Global styles
│   └── assets/              # Static assets
├── public/                  # Static files
├── index.html               # HTML template
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration
├── eslint.config.js        # ESLint configuration
└── package.json            # Project dependencies
```

## 🐛 Troubleshooting

### Ngrok Connection Issues
- Verify ngrok URL is correct and recently generated
- Check that the backend server is running
- Ensure ngrok tunnel is active (should show "online" status)
- Look for CORS errors in the browser console

### Camera Issues
- Check browser permissions for camera access
- Close other applications using the camera
- Restart the browser if camera isn't detected
- Ensure good lighting for facial recognition

### Facial Recognition Not Working
- Ensure faces are clearly visible in the camera frame
- Provide multiple varied images during training
- Check that backend server has the facial recognition models installed
- Verify API response in browser developer tools (F12 → Network tab)

## 📚 Related Documentation

- Backend API: See `../backend/README.md` for Python backend setup
- Teacher Panel: See `../teacher-panel/` for teacher interface

## 🤝 Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly with different scenarios
4. Submit a pull request with clear description

## 📄 License

This project is part of the Major Project portfolio.

## ⚙️ Environment Setup

For development, ensure you have:
- Node.js 16+ installed
- npm or yarn package manager
- Python backend running (for API calls)
- ngrok installed and configured (for backend tunneling)

## 🔐 Security Notes

- Never commit ngrok URLs with sensitive data to version control
- Regenerate ngrok URLs periodically for security
- Use environment variables for production API endpoints
- Validate all user inputs on both frontend and backend
