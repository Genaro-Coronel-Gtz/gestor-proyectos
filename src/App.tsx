import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from './hooks';
import { addProject, updateProject, setProjects, deleteProject } from './store';
import type { Project, Task } from './store';
import {
  Container, Box, Typography, Button, Card, CardContent, CardHeader, TextField, Chip,
  LinearProgress, Grid, Stack, IconButton, CardActionArea, Link, Paper,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, Checkbox, useMediaQuery, useTheme as useMuiTheme
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

// Interface for image previews in TaskFormModal
interface ImagePreview {
  id: string; // Unique ID for keying
  file?: File; // For new files
  url?: string; // For existing attachments
  attachmentName?: string; // For existing attachments, their name in PouchDB
  isNew: boolean;
}

// --- DIALOGO/MODAL PARA TAREAS ---
const TaskFormModal = ({ open, onClose, onSave, task, projectId }: { open: boolean, onClose: () => void, onSave: (task: Task, imagePreviews: ImagePreview[]) => void, task: Task | null, projectId: string }) => {
  const [formData, setFormData] = useState<Task | null>(null);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const muiTheme = useMuiTheme();
  const fullScreen = useMediaQuery(muiTheme.breakpoints.down('md'));

  // Helper to fetch existing attachments
  const fetchExistingAttachments = async (taskToFetch: Task, currentProjectId: string) => {
    if (!taskToFetch.photoAttachmentNames || taskToFetch.photoAttachmentNames.length === 0) {
      setImagePreviews([]);
      return;
    }

    const newPreviews: ImagePreview[] = [];
    try {
      // Fetch the project document to get its _rev and access attachments
      const projectDoc = await db.get(currentProjectId, { attachments: true });

      for (const name of taskToFetch.photoAttachmentNames) {
        if (projectDoc._attachments && projectDoc._attachments[name]) {
          const blob = await db.getAttachment(currentProjectId, name);
          if (blob) {
            newPreviews.push({
              id: name, // Use attachment name as ID
              url: URL.createObjectURL(blob as Blob),
              attachmentName: name,
              isNew: false,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching existing attachments:", error);
    }
    setImagePreviews(newPreviews);
  };

  useEffect(() => {
    if (task) {
      setFormData(task);
      fetchExistingAttachments(task, projectId);
    } else {
      setFormData(null);
      setImagePreviews([]); // Clear previews if no task
    }
  }, [task, projectId]); // Depend on task and projectId

  // New useEffect specifically for cleaning up imagePreviews URLs
  useEffect(() => {
    // This effect's cleanup function will have access to the *latest* imagePreviews
    return () => {
      imagePreviews.forEach(preview => {
        if (preview.url) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, [imagePreviews]); // This effect runs whenever imagePreviews changes.


  const handleRemoveImage = (id: string) => {
    setImagePreviews(prev => {
      const removedPreview = prev.find(p => p.id === id);
      if (removedPreview && removedPreview.url && removedPreview.isNew) {
        URL.revokeObjectURL(removedPreview.url);
      }
      return prev.filter(preview => preview.id !== id);
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newFilesToProcess = files.filter(file => file.type.startsWith('image/'));

    setImagePreviews(prev => {
      const currentNewFilesCount = prev.filter(p => p.isNew).length;
      const availableSlots = 3 - currentNewFilesCount - (prev.length - currentNewFilesCount); // Total 3 - existing - new already picked

      const newPreviews = newFilesToProcess.slice(0, availableSlots).map(file => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
        isNew: true,
      }));

      return [...prev, ...newPreviews];
    });
    event.target.value = ''; // Clear the input so same file can be selected again
  };

  if (!formData) return null;

  const handleChange = (field: keyof Task, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };
  
  const handleSave = () => {
    if (formData) {
      onSave(formData, imagePreviews);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
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
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>Fotos (máximo 3)</Typography>
            <input
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              id="task-file-upload"
              onChange={handleFileChange}
            />
            <label htmlFor="task-file-upload">
              <Button variant="outlined" component="span" startIcon={<Add />} disabled={imagePreviews.length >= 3}>
                Adjuntar Fotos
              </Button>
            </label>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
              {imagePreviews.map(preview => (
                <Card key={preview.id} sx={{ maxWidth: 150, position: 'relative' }}>
                  <img src={preview.url} alt="Preview" style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' }
                    }}
                    onClick={() => handleRemoveImage(preview.id)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Card>
              ))}
            </Box>
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
  const [taskImageUrls, setTaskImageUrls] = useState<Record<string, {name: string, url: string}[]>>({});

  useEffect(() => {
    if (!project) {
      navigate('/');
      return;
    }

    const fetchAndSetImageUrls = async () => {
      const urls: Record<string, {name: string, url: string}[]> = {};
      const currentProjectDoc = await db.get(project._id, { attachments: true }).catch(() => null);
      if (!currentProjectDoc) return;

      for (const task of project.tasks) {
        if (task.photoAttachmentNames && task.photoAttachmentNames.length > 0) {
          const taskSpecificUrls: {name: string, url: string}[] = [];
          for (const attachmentName of task.photoAttachmentNames) {
            if (currentProjectDoc._attachments && currentProjectDoc._attachments[attachmentName]) {
              try {
                const blob = await db.getAttachment(project._id, attachmentName);
                if (blob) {
                  taskSpecificUrls.push({ name: attachmentName, url: URL.createObjectURL(blob as Blob) });
                }
              } catch (error) {
                console.error(`Error fetching attachment ${attachmentName} for task ${task.id}:`, error);
              }
            }
          }
          urls[task.id] = taskSpecificUrls;
        }
      }
      setTaskImageUrls(urls);
    };

    fetchAndSetImageUrls();
  }, [project, navigate]); // Depend on project to refetch images when tasks change.

  // New useEffect specifically for cleaning up taskImageUrls
  useEffect(() => {
    return () => {
      Object.values(taskImageUrls).flat().forEach(image => {
        URL.revokeObjectURL(image.url);
      });
    };
  }, [taskImageUrls]);


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

  const handleSaveTask = async (taskToSave: Task, imagePreviews?: ImagePreview[]) => {
    if (!project) return;

    let currentProjectRev = project._rev;
    let updatedTask = { ...taskToSave };

    // Assign final ID for new tasks before processing attachments
    if (updatedTask.id.startsWith('new-')) {
      updatedTask.id = crypto.randomUUID();
    }

    if (imagePreviews) { // Only process attachments if imagePreviews are provided
      const existingAttachmentNames = updatedTask.photoAttachmentNames || [];
      const newAttachmentNames: string[] = [];

      // Filter out existing attachments from previews and get new files to upload
      const attachmentsToKeep = imagePreviews.filter(p => !p.isNew && p.attachmentName);
      const filesToUpload = imagePreviews.filter(p => p.isNew && p.file);

      // Identify attachments to remove
      const attachmentNamesToKeep = attachmentsToKeep.map(p => p.attachmentName as string);
      const attachmentsToRemove = existingAttachmentNames.filter(name => !attachmentNamesToKeep.includes(name));

      try {
        // 1. Fetch the latest project document to get its current _rev
        let projectDoc = await db.get(project._id);
        currentProjectRev = projectDoc._rev;

        // 2. Remove attachments
        for (const attachmentName of attachmentsToRemove) {
          try {
            const latestProjectDoc = await db.get(project._id); // Get fresh _rev before current operation
            currentProjectRev = latestProjectDoc._rev; // Update currentProjectRev

            const response = await db.removeAttachment(project._id, attachmentName, currentProjectRev);
            if (response && response.rev) { // Crucial: Update currentProjectRev from the response of the successful operation
              currentProjectRev = response.rev;
            } else {
              console.warn(`db.removeAttachment for ${attachmentName} returned an unexpected response or no rev. The project document's revision might not be updated correctly for subsequent operations.`);
            }
          } catch (error: any) { // Use 'any' for error type to access .status and .name
            console.error(`Error removing attachment ${attachmentName}:`, error);
            if (error.status === 404 || error.name === 'not_found') {
                console.warn(`Attachment ${attachmentName} not found during removal attempt. Continuing.`);
            } else {
                throw error; // Re-throw other critical errors
            }
          }
        }

        // 3. Add new attachments
        for (const filePreview of filesToUpload) {
          if (!filePreview.file) continue;
          try {
            const latestProjectDoc = await db.get(project._id); // Get fresh _rev before current operation
            currentProjectRev = latestProjectDoc._rev; // Update currentProjectRev

            const attachmentId = `task-${updatedTask.id}-photo-${crypto.randomUUID()}`;
            const response = await db.putAttachment(
              project._id,
              attachmentId,
              currentProjectRev,
              filePreview.file,
              filePreview.file.type
            );
            if (response && response.rev) { // Crucial: Update currentProjectRev from the response of the successful operation
              currentProjectRev = response.rev;
              newAttachmentNames.push(attachmentId);
            } else {
              console.warn(`db.putAttachment for file ${filePreview.file.name} returned an unexpected response. This attachment will not be linked to the task, and the project document's revision might not be updated correctly for subsequent operations.`);
            }
          } catch (error) {
            console.error(`Error adding attachment for file ${filePreview.file.name}:`, error);
            throw error;
          }
        }

                // 4. Update task's photoAttachmentNames

                updatedTask.photoAttachmentNames = [...attachmentNamesToKeep, ...newAttachmentNames];

                console.log("DEBUG: updatedTask.photoAttachmentNames after processing:", updatedTask.photoAttachmentNames); // Added for debugging

              } catch (error) {
        console.error("Error processing attachments:", error);
        throw error; // Re-throw so the outer catch can handle it
      }
    } else {
      // If imagePreviews are not provided, we are not changing attachments.
      // So, the photoAttachmentNames of the task should remain as they are.
      // This is important for when the 'completed' checkbox is toggled.
      updatedTask.photoAttachmentNames = taskToSave.photoAttachmentNames;
    }

    try {
      // 5. Update tasks array in project and update PouchDB and Redux
      let tasksAfterAttachmentUpdate;
      if (taskToSave.id.startsWith('new-')) {
        tasksAfterAttachmentUpdate = [...project.tasks, updatedTask];
      } else {
        tasksAfterAttachmentUpdate = project.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
      }
      
      const projectToUpdate = { ...project, _rev: currentProjectRev, tasks: tasksAfterAttachmentUpdate };

      // Get the very latest version of the project document right before the final put
      const latestProjectDocFromDb = await db.get(project._id);

      const finalProjectToPut = {
        ...latestProjectDocFromDb, // Start with the absolute latest document from the DB
        tasks: tasksAfterAttachmentUpdate, // Apply our updated tasks
        // No need to explicitly set _rev here, as it's already in latestProjectDocFromDb
      };
      
      await db.put(finalProjectToPut); // This should now use the correct _rev
      dispatch(updateProject(finalProjectToPut)); // Update Redux state

      setTaskModalOpen(false);
      setEditingTask(null);

    } catch (error) {
      console.error("Error saving task with attachments:", error);
      // Handle error, e.g., show a message to the user
    }
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

      <Card elevation={8}>
        <CardHeader
          title={<Typography variant="h3" component="h1" gutterBottom>{project.name}</Typography>}
          subheader={`ID: ${project._id}`}
          action={
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
                  {taskImageUrls[task.id] && taskImageUrls[task.id].length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {taskImageUrls[task.id].map((image, index) => (
                        <Card key={index} sx={{ width: 100, height: 100, overflow: 'hidden' }}>
                          <img src={image.url} alt={`Task attachment ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </Card>
                      ))}
                    </Box>
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
        projectId={project._id}
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
    <Container maxWidth="lg" sx={{ py: 5 }}>
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
            dispatch(addProject({ _id: crypto.randomUUID(), name, tasks: [] }));
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
                <Card elevation={8} sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.3s, box-shadow 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 12 } }}>
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