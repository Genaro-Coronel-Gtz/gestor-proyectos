import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from './hooks';
import { addProject, updateProject, setProjects, deleteProject } from './store';
import type { Project, Task } from './store';
import {
  Container, Box, Typography, Button, Card, CardContent, CardHeader, TextField, Chip,
  LinearProgress, Grid, Stack, IconButton, CardActionArea, Link, Paper,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, Checkbox
} from '@mui/material';
import {
  Add, CheckCircle, RadioButtonUnchecked, BusinessCenter, CalendarToday, Person, AttachMoney,
  Edit, Save, ArrowBack, Delete, GridView, Notes
} from '@mui/icons-material';

import PouchDB from 'pouchdb';
const db = new PouchDB<Project>('projects_db');

// --- HELPER: CALCULAR PROGRESO ---
const getStats = (tasks: Task[]) => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const percentage = total === 0 ? 0 : (completed / total) * 100;
  const budget = tasks.reduce((acc, t) => acc + (t.budget || 0), 0);
  return { percentage, completed, total, budget };
};

// --- VISTA: DETALLE DEL PROYECTO ---
const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const project = useAppSelector(state => state.projects.list.find(p => p._id === id));
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    // Si el proyecto se elimina mientras se visualiza, navega al inicio.
    if (!project) {
      navigate('/');
    }
  }, [project, navigate]);

  if (!project) return null; // O un spinner de carga

  const stats = getStats(project.tasks);

  const handleUpdateTask = (taskId: string, data: Partial<Task>) => {
    const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, ...data } : t);
    dispatch(updateProject({ ...project, tasks: updatedTasks }));
  };

  const handleDeleteProject = () => {
    dispatch(deleteProject(project._id));
    setDeleteDialogOpen(false);
    // La navegación se gestiona en el useEffect
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/')} sx={{ mb: 4 }}>
        Volver al Dashboard
      </Button>

      <Card elevation={4}>
        <CardHeader
          title={<Typography variant="h3" component="h1" gutterBottom>{project.name}</Typography>}
          subheader={`ID: ${project._id}`}
          action={
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  const newTask: Task = { id: crypto.randomUUID(), name: "Nueva Tarea", duration: "1d", startDate: new Date().toISOString().split('T')[0], endDate: "", estimatedTime: "8h", assignee: "Sin asignar", notes: "", budget: 0, completed: false };
                  dispatch(updateProject({ ...project, tasks: [...project.tasks, newTask] }));
                  setEditingTaskId(newTask.id);
                }}
              >
                Nueva Tarea
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setDeleteDialogOpen(true)}
              >
                Eliminar Proyecto
              </Button>
            </Stack>
          }
          sx={{ alignItems: 'flex-start' }}
        />
        <CardContent>
          <Stack spacing={1} sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Progreso General</Typography>
              <Typography variant="body2" color="text.secondary">{Math.round(stats.percentage)}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={stats.percentage} sx={{ height: 10, borderRadius: 5 }} />
          </Stack>
          
          <Stack spacing={2}>
            {project.tasks.map(task => (
              <Paper 
                key={task.id} 
                elevation={editingTaskId === task.id ? 4 : 1}
                sx={{ p: 2, transition: 'box-shadow 0.3s', opacity: task.completed ? 0.7 : 1, bgcolor: task.completed ? 'grey.50' : 'background.paper' }}
              >
                {editingTaskId === task.id ? (
                  <Box>
                    <Grid container spacing={2} alignItems="center" flex={1}>
                      <Grid item xs={12} md={6}>
                        <TextField size="small" fullWidth label="Nombre de tarea" value={task.name} onChange={e => handleUpdateTask(task.id, { name: e.target.value })} />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField size="small" fullWidth label="Responsable" value={task.assignee} onChange={e => handleUpdateTask(task.id, { assignee: e.target.value })} />
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <TextField size="small" fullWidth label="Fecha de Inicio" type="date" InputLabelProps={{ shrink: true }} value={task.startDate} onChange={e => handleUpdateTask(task.id, { startDate: e.target.value })} />
                      </Grid>
                       <Grid item xs={6} md={3}>
                        <TextField size="small" fullWidth label="Fecha de Fin" type="date" InputLabelProps={{ shrink: true }} value={task.endDate} onChange={e => handleUpdateTask(task.id, { endDate: e.target.value })} />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField size="small" fullWidth label="Presupuesto" type="number" value={task.budget} onChange={e => handleUpdateTask(task.id, { budget: Number(e.target.value) })} />
                      </Grid>
                       <Grid item xs={12}>
                        <TextField size="small" fullWidth label="Notas" multiline rows={3} value={task.notes} onChange={e => handleUpdateTask(task.id, { notes: e.target.value })} />
                      </Grid>
                    </Grid>
                    <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2}}>
                        <FormControlLabel control={<Checkbox checked={task.completed} onChange={e => handleUpdateTask(task.id, { completed: e.target.checked })} />} label="Completada" />
                        <Button variant="contained" color="primary" onClick={() => setEditingTaskId(null)} startIcon={<Save />}>Guardar</Button>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <FormControlLabel control={<Checkbox checked={task.completed} onChange={e => handleUpdateTask(task.id, { completed: e.target.checked })} />} label={<Typography variant="h6" sx={{ textDecoration: task.completed ? 'line-through' : 'none' }}>{task.name}</Typography>} />
                      <Box>
                        <IconButton color="default" onClick={() => setEditingTaskId(task.id)}><Edit /></IconButton>
                        <IconButton color="error" onClick={() => {
                          const updated = project.tasks.filter(t => t.id !== task.id);
                          dispatch(updateProject({ ...project, tasks: updated }));
                        }}><Delete /></IconButton>
                      </Box>
                    </Box>
                    <Stack direction="row" spacing={2} mt={1} flexWrap="wrap" gap={1}>
                      <Chip icon={<Person />} label={task.assignee || 'N/A'} size="small" />
                      <Chip icon={<AttachMoney />} label={`$${task.budget || 0}`} size="small" />
                      <Chip icon={<CalendarToday />} label={`Inicio: ${task.startDate || 'N/A'}`} size="small" />
                      <Chip icon={<CalendarToday />} label={`Fin: ${task.endDate || 'N/A'}`} size="small" />
                    </Stack>
                    {task.notes && (
                        <Paper elevation={0} variant="outlined" sx={{p: 2, mt: 2, bgcolor: 'grey.50'}}>
                            <Typography variant="body2" color="text.secondary">{task.notes}</Typography>
                        </Paper>
                    )}
                  </Box>
                )}
              </Paper>
            ))}
          </Stack>
        </CardContent>
      </Card>
      
      {/* Dialogo de confirmación de borrado */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que quieres eliminar el proyecto "{project.name}"? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeleteProject} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// --- VISTA: DASHBOARD ---
const Dashboard = () => {
  const projects = useAppSelector(state => state.projects.list);
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');

  return (
    <Container maxWidth="xl" sx={{ py: 5 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 6 }}>
        <Box>
          <Typography variant="h2" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <GridView color="primary" sx={{ fontSize: 40 }}/> Proyectos
          </Typography>
          <Typography variant="h6" color="text.secondary" component="p">
            Gestiona tus tareas y presupuestos en un solo lugar.
          </Typography>
        </Box>
        <Paper component="form" sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: { xs: '100%', md: 400 } }} onSubmit={(e) => e.preventDefault()}>
          <TextField
            sx={{ ml: 1, flex: 1 }}
            placeholder="Nombre del proyecto..."
            value={name}
            onChange={e => setName(e.target.value)}
            variant="standard"
            InputProps={{ disableUnderline: true }}
          />
          <Button variant="contained" onClick={() => {
            if (!name) return;
            dispatch(addProject({ _id: new Date().toISOString(), name, tasks: [] }));
            setName('');
          }}>
            Crear
          </Button>
        </Paper>
      </Stack>

      {projects.length > 0 ? (
        <Grid container spacing={4}>
          {projects.map(proj => {
            const stats = getStats(proj.tasks);
            return (
              <Grid item xs={12} sm={6} md={4} key={proj._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.3s, box-shadow 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
                  <CardActionArea component={RouterLink} to={`/project/${proj._id}`}>
                    <CardHeader
                      avatar={<BusinessCenter fontSize="large" color="primary" />}
                      action={<Chip label={`$${stats.budget.toLocaleString()}`} />}
                      title={<Typography variant="h5">{proj.name}</Typography>}
                    />
                    <CardContent>
                      <Stack spacing={1}>
                        <LinearProgress variant="determinate" value={stats.percentage} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">{stats.completed}/{stats.total} Tareas</Typography>
                          <Typography variant="caption" color="text.secondary">{Math.round(stats.percentage)}%</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Paper elevation={0} variant="outlined" sx={{ py: 10, textAlign: 'center', borderStyle: 'dashed' }}>
          <BusinessCenter sx={{ fontSize: 60, color: 'text.secondary' }} />
          <Typography variant="h5" component="h2" sx={{ mt: 2 }}>No hay proyectos todavía</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Crea tu primer proyecto para empezar a organizar tus tareas.
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

// --- MAIN APP ---
export default function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    db.allDocs({ include_docs: true }).then(res => {
      const docs = res.rows.map(row => row.doc).filter((doc): doc is Project & { _rev: string } => !!doc);
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