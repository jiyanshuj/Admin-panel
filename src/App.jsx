// App.jsx
import React, { useState, useEffect } from 'react';
import Student from './COMPONENTS/Student';
import Teacher from './COMPONENTS/Teacher';

function App() {
  const [activePage, setActivePage] = useState(null);

  // Lock scroll when modal/page open
  useEffect(() => {
    if (activePage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [activePage]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {!activePage ? (
        // Initial selection screen, fullscreen center
        <main className="flex-grow flex flex-col justify-center items-center px-4">
          <h1 className="text-4xl font-extrabold mb-8 text-gray-900 select-none">
            Select User Type
          </h1>
          <div className="flex flex-col sm:flex-row gap-6">
            <button
              onClick={() => setActivePage('student')}
              className="px-10 py-5 bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 text-white rounded-lg text-xl font-semibold shadow-lg transition"
              aria-label="Open Student Component"
            >
              Student
            </button>
            <button
              onClick={() => setActivePage('teacher')}
              className="px-10 py-5 bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 text-white rounded-lg text-xl font-semibold shadow-lg transition"
              aria-label="Open Teacher Component"
            >
              Teacher
            </button>
          </div>
        </main>
      ) : (
        // Fullscreen page wrapper
        <div className="h-screen w-full flex flex-col bg-white shadow-xl overflow-auto">
          {/* Header with back */}
          <header className="flex items-center px-6 py-4 border-b border-gray-200 bg-white shadow-sm select-none">
            <button
              onClick={() => setActivePage(null)}
              aria-label="Go back"
              className="mr-4 p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              ← Back
            </button>
            <h2 className="text-2xl font-semibold text-gray-800 truncate capitalize">
              {activePage}
            </h2>
          </header>

          {/* Main content area */}
          <main className="flex-grow overflow-auto max-w-full px-6 py-8">
            <div className="max-w-7xl mx-auto h-full">
              {activePage === 'student' && <Student />}
              {activePage === 'teacher' && <Teacher />}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
