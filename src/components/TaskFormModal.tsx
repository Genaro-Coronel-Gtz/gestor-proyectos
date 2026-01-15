import React, { useState, useEffect } from 'react';
import type { Task } from '../store';
import {
  Button,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, TextField, FormControlLabel, Checkbox,
  useMediaQuery, useTheme as useMuiTheme, Box, Card, IconButton, Typography
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { dbInstance } from '../services/pouchdbService';

// Interface for image previews in TaskFormModal
export interface ImagePreview {
  id: string; // Unique ID for keying
  file?: File; // For new files
  url?: string; // For existing attachments
  attachmentName?: string; // For existing attachments, their name in PouchDB
  isNew: boolean;
}

// --- DIALOGO/MODAL PARA TAREAS ---
const TaskFormModal = ({ open, onClose, onSave, task, projectId, readOnly }: { open: boolean, onClose: () => void, onSave: (task: Task, imagePreviews: ImagePreview[]) => void, task: Task | null, projectId: string, readOnly: boolean }) => {
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
      const projectDoc = await dbInstance.get(currentProjectId, { attachments: true });

      for (const name of taskToFetch.photoAttachmentNames) {
        if (projectDoc._attachments && projectDoc._attachments[name]) {
          const blob = await dbInstance.getAttachment(currentProjectId, name);
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
            <TextField autoFocus label="Nombre de tarea" fullWidth value={formData.name} onChange={e => handleChange('name', e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Responsable" fullWidth value={formData.assignee} onChange={e => handleChange('assignee', e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Fecha de Inicio" type="date" fullWidth InputLabelProps={{ shrink: true }} value={formData.startDate} onChange={e => handleChange('startDate', e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Fecha de Fin" type="date" fullWidth InputLabelProps={{ shrink: true }} value={formData.endDate} onChange={e => handleChange('endDate', e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Presupuesto" type="number" fullWidth value={formData.budget} onChange={e => handleChange('budget', Number(e.target.value))} disabled={readOnly} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Notas" multiline rows={4} fullWidth value={formData.notes} onChange={e => handleChange('notes', e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel control={<Checkbox checked={formData.completed} onChange={e => handleChange('completed', e.target.checked)} disabled={readOnly} />} label="Completada" />
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
              disabled={readOnly} // Disable file input itself
            />
            {!readOnly && ( // Only show button if not in readOnly mode
              <label htmlFor="task-file-upload">
                <Button variant="outlined" component="span" startIcon={<Add />} disabled={imagePreviews.length >= 3 || readOnly}>
                  Adjuntar Fotos
                </Button>
              </label>
            )}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
              {imagePreviews.map(preview => (
                <Card key={preview.id} sx={{ maxWidth: 150, position: 'relative' }}>
                  <img src={preview.url} alt="Preview" style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                  {!readOnly && ( // Only show remove button if not in readOnly mode
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
                  )}
                </Card>
              ))}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button> {/* Always show a close button */}
        {!readOnly && ( // Only show Save button if not in readOnly mode
          <Button onClick={handleSave} variant="contained">Guardar</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TaskFormModal;
