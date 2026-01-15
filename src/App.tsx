import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAppDispatch } from './hooks';
import { setProjects } from './store';
import { getAllProjects } from './services/pouchdbService';
import Dashboard from './components/Dashboard';
import ProjectDetail from './components/ProjectDetail';
import Layout from './components/Layout';

// --- MAIN APP ---
export default function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    getAllProjects().then(docs => {
      dispatch(setProjects(docs));
    });
  }, [dispatch]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
      </Route>
    </Routes>
  );
}