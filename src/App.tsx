import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAppDispatch } from './hooks';
import { setProjects } from './store';
import { Box } from '@mui/material';
import { getAllProjects } from './services/pouchdbService';
import Dashboard from './components/Dashboard';
import ProjectDetail from './components/ProjectDetail';

// --- MAIN APP ---
export default function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    getAllProjects().then(docs => {
      dispatch(setProjects(docs));
    });
  }, [dispatch]);

  return (
    <Box>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
      </Routes>
    </Box>
  );
}