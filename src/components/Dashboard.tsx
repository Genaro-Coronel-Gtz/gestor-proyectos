import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import { addProject, setProjects } from '../store';
import type { Project, Task } from '../store';
import {
  Container, Box, Typography, Button, Card, CardContent, CardHeader,
  LinearProgress, Grid, Stack, IconButton, CardActionArea, Paper, TextField, Chip
} from '@mui/material';
import {
  GridView, Brightness4, Brightness7, Assignment
} from '@mui/icons-material';
import { useTheme } from '../ThemeContext';
import { getStats, dbInstance, blobToBase64, base64toBlob, getAllProjects } from '../services/pouchdbService';

// --- VISTA: DASHBOARD ---
const Dashboard = () => {
  const projects = useAppSelector(state => state.projects.list);
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');
  const { mode, toggleTheme } = useTheme();

  const handleExportData = async () => {
    const allProjects = projects;

    const exportData: Project[] = [];

    for (const project of allProjects) {
      const projectCopy: Project = JSON.parse(JSON.stringify(project));
      projectCopy.tasks = [];

      for (const task of project.tasks) {
        const taskCopy: Task = JSON.parse(JSON.stringify(task));
        const attachmentsData: { name: string, data: string, contentType: string }[] = [];

        if (task.photoAttachmentNames && task.photoAttachmentNames.length > 0) {
          for (const attachmentName of task.photoAttachmentNames) {
            try {
              const blob = await dbInstance.getAttachment(project._id, attachmentName);
              if (blob) {
                const base64 = await blobToBase64(blob as Blob);
                attachmentsData.push({
                  name: attachmentName,
                  data: base64,
                  contentType: blob.type
                });
              }
            } catch (error) {
              console.error(`Error fetching attachment ${attachmentName} for export:`, error);
            }
          }
        }
        (taskCopy as any)._attachmentsData = attachmentsData;
        delete taskCopy.photoAttachmentNames;

        projectCopy.tasks.push(taskCopy);
      }
      exportData.push(projectCopy);
    }

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'task-manager-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Datos exportados.');
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Importar datos...');
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonString = e.target?.result as string;
        const importedProjects: Project[] = JSON.parse(jsonString);
        const projectsToSave: Project[] = [];

        for (let project of importedProjects) {
          const newProjectId = crypto.randomUUID();
          project._id = newProjectId;
          project._rev = undefined;

          let projectToPut = { ...project, tasks: [] as Task[], _attachments: {} };

          let saveResponse = await dbInstance.put(projectToPut);
          project._rev = saveResponse.rev;

          const newTasks: Task[] = [];
          for (let task of project.tasks) {
            const newTaskId = crypto.randomUUID();
            task.id = newTaskId;

            const photoAttachmentNames: string[] = [];
            const attachmentsData = (task as any)._attachmentsData as { name: string, data: string, contentType: string }[] || [];

            for (const attachment of attachmentsData) {
                try {
                    const blob = base64toBlob(attachment.data, attachment.contentType);
                    const attachmentId = `task-${task.id}-photo-${crypto.randomUUID()}`;

                    const latestProjectDoc = await dbInstance.get(project._id, { attachments: true });
                    project._rev = latestProjectDoc._rev;

                    const putAttachmentResponse = await dbInstance.putAttachment(
                        project._id,
                        attachmentId,
                        project._rev,
                        blob,
                        attachment.contentType
                    );
                    project._rev = putAttachmentResponse.rev;
                    photoAttachmentNames.push(attachmentId);
                } catch (attachmentError) {
                    console.error(`Error importing attachment ${attachment.name} for task ${task.id}:`, attachmentError);
                }
            }
            task.photoAttachmentNames = photoAttachmentNames;
            delete (task as any)._attachmentsData;
            newTasks.push(task);
          }
          project.tasks = newTasks;

          const docFromDb = await dbInstance.get(project._id, { attachments: true });
          const finalProjectData = {
            ...project,
            _attachments: docFromDb._attachments,
          };

          await dbInstance.put(finalProjectData);
          projectsToSave.push(finalProjectData);
        }

        const allDocs = await getAllProjects();
        dispatch(setProjects(allDocs));
        console.log('Datos importados con éxito.');

      } catch (error) {
        console.error('Error al importar datos:', error);
      }
    };
    reader.readAsText(file);

    event.target.value = ''; 
  };

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
        <Stack direction="row" spacing={2} alignItems="center">
          <Button variant="outlined" onClick={handleExportData}>Exportar Datos</Button>
          <input
            type="file"
            accept=".json"
            id="import-file"
            style={{ display: 'none' }}
            onChange={handleImportData}
          />
          <label htmlFor="import-file">
            <Button variant="outlined" component="span">Importar Datos</Button>
          </label>
        </Stack>
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

export default Dashboard;
