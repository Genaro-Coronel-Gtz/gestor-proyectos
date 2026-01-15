import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import { updateProject, deleteProject as deleteProjectAction } from '../store';
import type { Project, Task } from '../store';
import {
  Container, Box, Typography, Button, Card, CardContent, CardHeader, Chip,
  LinearProgress, Grid, Stack, IconButton, Paper, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, FormControlLabel, Checkbox
} from '@mui/material';
import {
  Add, ArrowBack, Delete, Edit, Visibility
} from '@mui/icons-material';
import { useTheme } from '../ThemeContext';
import TaskFormModal, { ImagePreview } from './TaskFormModal';
import { dbInstance, getStats, removeAttachment, addAttachment, getProject } from '../services/pouchdbService';

// --- VISTA: DETALLE DEL PROYECTO ---
const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const project = useAppSelector(state => state.projects.list.find(p => p._id === id));
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isModalReadOnly, setIsModalReadOnly] = useState(false);

  useEffect(() => {
    if (!project) {
      navigate('/');
    }
  }, [project, navigate]);

  if (!project) return null;

  const stats = getStats(project.tasks);

  const handleOpenNewTask = () => {
    setEditingTask({ id: `new-${crypto.randomUUID()}`, name: "Nueva Tarea", duration: "1d", startDate: new Date().toISOString().split('T')[0], endDate: "", estimatedTime: "8h", assignee: "Sin asignar", notes: "", budget: 0, completed: false });
    setIsModalReadOnly(false);
    setTaskModalOpen(true);
  };
  
  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalReadOnly(false);
    setTaskModalOpen(true);
  };

  const handleViewTask = (task: Task) => {
    setEditingTask(task);
    setIsModalReadOnly(true);
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (taskToSave: Task, imagePreviews?: ImagePreview[]) => {
    if (!project) return;
  
    let currentProjectRev = project._rev;
    let updatedTask = { ...taskToSave };
  
    if (updatedTask.id.startsWith('new-')) {
      updatedTask.id = crypto.randomUUID();
    }
  
    if (imagePreviews) {
      const existingAttachmentNames = updatedTask.photoAttachmentNames || [];
      const newAttachmentNames: string[] = [];
  
      const attachmentsToKeep = imagePreviews.filter(p => !p.isNew && p.attachmentName);
      const filesToUpload = imagePreviews.filter(p => p.isNew && p.file);
      const attachmentNamesToKeep = attachmentsToKeep.map(p => p.attachmentName as string);
      const attachmentsToRemove = existingAttachmentNames.filter(name => !attachmentNamesToKeep.includes(name));
  
      try {
        let projectDoc = await getProject(project._id);
        currentProjectRev = projectDoc._rev;
  
        for (const attachmentName of attachmentsToRemove) {
          try {
            const latestProjectDoc = await getProject(project._id);
            currentProjectRev = latestProjectDoc._rev;
  
            const response = await removeAttachment(project._id, attachmentName, currentProjectRev);
            if (response && response.rev) {
              currentProjectRev = response.rev;
            }
          } catch (error: any) {
            console.error(`Error removing attachment ${attachmentName}:`, error);
            if (error.status !== 404 && error.name !== 'not_found') {
              throw error;
            }
          }
        }
  
        for (const filePreview of filesToUpload) {
          if (!filePreview.file) continue;
          try {
            const latestProjectDoc = await getProject(project._id);
            currentProjectRev = latestProjectDoc._rev;
  
            const attachmentId = `task-${updatedTask.id}-photo-${crypto.randomUUID()}`;
            const response = await addAttachment(project._id, currentProjectRev, attachmentId, filePreview.file);
            if (response && response.rev) {
              currentProjectRev = response.rev;
              newAttachmentNames.push(attachmentId);
            }
          } catch (error) {
            console.error(`Error adding attachment for file ${filePreview.file.name}:`, error);
            throw error;
          }
        }
  
        updatedTask.photoAttachmentNames = [...attachmentNamesToKeep, ...newAttachmentNames];
  
      } catch (error) {
        console.error("Error processing attachments:", error);
        throw error;
      }
    } else {
      updatedTask.photoAttachmentNames = taskToSave.photoAttachmentNames;
    }
  
    try {
      let tasksAfterAttachmentUpdate;
      if (taskToSave.id.startsWith('new-')) {
        tasksAfterAttachmentUpdate = [...project.tasks, updatedTask];
      } else {
        tasksAfterAttachmentUpdate = project.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
      }
      
      const latestProjectDocFromDb = await getProject(project._id);
  
      const finalProjectToPut = {
        ...latestProjectDocFromDb,
        tasks: tasksAfterAttachmentUpdate,
      };
      
      await dbInstance.put(finalProjectToPut);
      dispatch(updateProject(finalProjectToPut));
  
      setTaskModalOpen(false);
      setEditingTask(null);
  
    } catch (error) {
      console.error("Error saving task with attachments:", error);
    }
  };

  const handleDeleteProject = () => {
    if(!project) return;
    dispatch(deleteProjectAction(project._id));
    setDeleteDialogOpen(false);
    navigate('/');
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
                      <IconButton color="default" onClick={() => handleViewTask(task)}><Visibility /></IconButton>
                      <IconButton color="default" onClick={() => handleOpenEditTask(task)}><Edit /></IconButton>
                      <IconButton color="error" onClick={() => handleDeleteTask(task.id)}><Delete /></IconButton>
                    </Box>
                  </Box>
                  <Stack direction="row" spacing={2} mt={1} flexWrap="wrap" gap={1}>
                    <Chip label={`Responsable: ${task.assignee || 'N/A'}`} size="small" />
                    <Chip label={`Presupuesto: $${task.budget || 0}`} size="small" />
                    <Chip label={`Inicio: ${task.startDate || 'N/A'}`} size="small" />
                    <Chip label={`Fin: ${task.endDate || 'N/A'}`} size="small" />
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
        projectId={project._id}
        readOnly={isModalReadOnly}
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

export default ProjectDetail;
