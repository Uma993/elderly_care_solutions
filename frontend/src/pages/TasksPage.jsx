import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ElderTasksPage from './ElderTasksPage.jsx';
import FamilyTasksPage from './FamilyTasksPage.jsx';

/**
 * Route /tasks: elder sees timeline + tasks; family sees elder's tasks (requires selected elder).
 */
function TasksPage() {
  const { currentUser } = useOutletContext();
  if (!currentUser) return null;
  if (currentUser.role === 'elderly') return <ElderTasksPage />;
  return <FamilyTasksPage />;
}

export default TasksPage;
