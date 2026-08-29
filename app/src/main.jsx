import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth.jsx';
import Home from './pages/Home.jsx';
import NewGame from './pages/NewGame.jsx';
import Entry from './pages/Entry.jsx';
import Display from './pages/Display.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/new"
            element={
              <RequireAuth>
                <NewGame />
              </RequireAuth>
            }
          />
          <Route
            path="/entry/:gameId"
            element={
              <RequireAuth>
                <Entry />
              </RequireAuth>
            }
          />
          <Route path="/display" element={<Display />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
