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
  Add, CheckCircle, RadioButtonUnchecked, Assignment, CalendarToday, Person, AttachMoney,
  Edit, Save, ArrowBack, Delete, GridView, Notes, Brightness4, Brightness7
} from '@mui/icons-material';
import { useTheme } from './ThemeContext';

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

// --- DIALOGO/MODAL PARA TAREAS ---
const TaskFormModal = ({ open, onClose, onSave, task }: { open: boolean, onClose: () => void, onSave: (task: Task) => void, task: Task | null }) => {
  const [formData, setFormData] = useState<Task | null>(null);

  useEffect(() => {
    setFormData(task);
  }, [task]);

  if (!formData) return null;

  const handleChange = (field: keyof Task, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };
  
  const handleSave = () => {
    if (formData) {
      onSave(formData);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{formData.id.startsWith('new-') ? 'Crear Nueva Tarea' : 'Editar Tarea'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField autoFocus label="Nombre de tarea" fullWidth value={formData.name} onChange={e => handleChange('name', e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Responsable" fullWidth value={formData.assignee} onChange={e => handleChange('assignee', e.target.value)} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Fecha de Inicio" type="date" fullWidth InputLabelProps={{ shrink: true }} value={formData.startDate} onChange={e => handleChange('startDate', e.target.value)} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Fecha de Fin" type="date" fullWidth InputLabelProps={{ shrink: true }} value={formData.endDate} onChange={e => handleChange('endDate', e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Presupuesto" type="number" fullWidth value={formData.budget} onChange={e => handleChange('budget', Number(e.target.value))} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Notas" multiline rows={4} fullWidth value={formData.notes} onChange={e => handleChange('notes', e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel control={<Checkbox checked={formData.completed} onChange={e => handleChange('completed', e.target.checked)} />} label="Completada" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">Guardar</Button>
      </DialogActions>
    </Dialog>
  );
};


// --- VISTA: DETALLE DEL PROYECTO ---
const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const project = useAppSelector(state => state.projects.list.find(p => p._id === id));
  const { mode, toggleTheme } = useTheme();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!project) {
      navigate('/');
    }
  }, [project, navigate]);

  if (!project) return null;

  const stats = getStats(project.tasks);

  const handleOpenNewTask = () => {
    setEditingTask({ id: `new-${crypto.randomUUID()}`, name: "Nueva Tarea", duration: "1d", startDate: new Date().toISOString().split('T')[0], endDate: "", estimatedTime: "8h", assignee: "Sin asignar", notes: "", budget: 0, completed: false });
    setTaskModalOpen(true);
  };
  
  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleSaveTask = (taskToSave: Task) => {
    let updatedTasks;
    if (taskToSave.id.startsWith('new-')) {
      // Es una nueva tarea
      updatedTasks = [...project.tasks, { ...taskToSave, id: crypto.randomUUID() }];
    } else {
      // Es una tarea existente
      updatedTasks = project.tasks.map(t => t.id === taskToSave.id ? taskToSave : t);
    }
    dispatch(updateProject({ ...project, tasks: updatedTasks }));
    setTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleDeleteProject = () => {
    if(!project) return;
    dispatch(deleteProject(project._id));
    setDeleteDialogOpen(false);
  };
  
  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = project.tasks.filter(t => t.id !== taskId);
    dispatch(updateProject({ ...project, tasks: updatedTasks }));
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
              <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
                {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
              <Button variant="contained" startIcon={<Add />} onClick={handleOpenNewTask}>
                Nueva Tarea
              </Button>
              <Button variant="outlined" color="error" startIcon={<Delete />} onClick={() => setDeleteDialogOpen(true)}>
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
                elevation={1}
                sx={{ p: 2, opacity: task.completed ? 0.7 : 1, bgcolor: task.completed ? 'background.default' : 'background.paper' }}
              >
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <FormControlLabel control={<Checkbox checked={task.completed} onChange={e => handleSaveTask({ ...task, completed: e.target.checked })} />} label={<Typography variant="h6" sx={{ textDecoration: task.completed ? 'line-through' : 'none' }}>{task.name}</Typography>} />
                    <Box>
                      <IconButton color="default" onClick={() => handleOpenEditTask(task)}><Edit /></IconButton>
                      <IconButton color="error" onClick={() => handleDeleteTask(task.id)}><Delete /></IconButton>
                    </Box>
                  </Box>
                  <Stack direction="row" spacing={2} mt={1} flexWrap="wrap" gap={1}>
                    <Chip icon={<Person />} label={task.assignee || 'N/A'} size="small" />
                    <Chip icon={<AttachMoney />} label={`$${task.budget || 0}`} size="small" />
                    <Chip icon={<CalendarToday />} label={`Inicio: ${task.startDate || 'N/A'}`} size="small" />
                    <Chip icon={<CalendarToday />} label={`Fin: ${task.endDate || 'N/A'}`} size="small" />
                  </Stack>
                  {task.notes && (
                    <Paper elevation={0} variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'background.paper' }}>
                      <Typography variant="body2" color="text.secondary">{task.notes}</Typography>
                    </Paper>
                  )}
                </Box>
              </Paper>
            ))}
          </Stack>
        </CardContent>
      </Card>
      
      <TaskFormModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        task={editingTask}
      />

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que quieres eliminar el proyecto "{project?.name}"? Esta acción no se puede deshacer.
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
  const { mode, toggleTheme } = useTheme();

  return (
    <Container maxWidth="xl" sx={{ py: 5 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 6 }}>
        <Box>
          <Typography variant="h2" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <GridView color="primary" sx={{ fontSize: 40 }}/> Proyectos
            <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
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
                      avatar={<Assignment fontSize="large" color="primary" />}
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
          <Assignment sx={{ fontSize: 60, color: 'text.secondary' }} />
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