import React, { useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import { setProjects } from '../store';
import type { Project, Task } from '../store';
import { Box } from '@mui/material';
import Header from './Header';
import { dbInstance, blobToBase64, base64toBlob, getAllProjects } from '../services/pouchdbService';

export default function Layout() {
  const projects = useAppSelector(state => state.projects.list);
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if(event.target) {
        event.target.value = '';
    }
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box>
      <Header onImport={triggerImport} onExport={handleExportData} />
      <input
        type="file"
        accept=".json"
        id="import-file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleImportData}
      />
      <main>
        <Outlet />
      </main>
    </Box>
  );
}