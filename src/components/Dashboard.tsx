import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import { addProject } from '../store';
import {
  Container, Box, Typography, Button, Card, CardContent, CardHeader,
  LinearProgress, Grid, Stack, CardActionArea, Paper, TextField, Chip
} from '@mui/material';
import {
  GridView, Assignment
} from '@mui/icons-material';
import { getStats } from '../services/pouchdbService';

// --- VISTA: DASHBOARD ---
const Dashboard = () => {
  const projects = useAppSelector(state => state.projects.list);
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
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
