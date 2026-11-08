'use strict';

/*
 * MyAgenda
 * Lógica compartida por index.html, registro.html y tareas.html.
 * Los registros se guardan en localStorage del navegador.
 */

const STORAGE_KEY = 'myagenda_activities';

function getActivities() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.error('No se pudieron leer las actividades guardadas:', error);
    return [];
  }
}

function saveActivities(activities) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
}

function createActivity(data) {
  return {
    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: data.title.trim(),
    subject: data.subject.trim(),
    dueDate: data.dueDate,
    priority: data.priority,
    description: data.description.trim(),
    completed: false,
    createdAt: new Date().toISOString()
  };
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[character]));
}

function formatDate(dateString) {
  if (!dateString) return 'Sin fecha';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function priorityClass(priority) {
  if (priority === 'Alta') return 'priority-high';
  if (priority === 'Baja') return 'priority-low';
  return 'priority-medium';
}

function setupMenu() {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (!menuButton || !nav) return;

  menuButton.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });
}

/* ------------------------- INICIO: estadísticas ------------------------- */

function renderDashboard() {
  const totalElement = document.getElementById('total-activities');
  if (!totalElement) return;

  const activities = getActivities();
  const pending = activities.filter((activity) => !activity.completed);
  const completed = activities.filter((activity) => activity.completed);

  totalElement.textContent = activities.length;
  document.getElementById('pending-activities').textContent = pending.length;
  document.getElementById('completed-activities').textContent = completed.length;

  const upcomingList = document.getElementById('upcoming-list');
  if (!upcomingList) return;

  const upcoming = pending
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);

  if (upcoming.length === 0) {
    upcomingList.innerHTML = `
      <article class="note note-yellow"><span class="note-pin" aria-hidden="true"></span>
        <p class="note-kicker">TU AGENDA</p><h3>Todo empieza aquí</h3>
        <p>Registra tu primera actividad para verla en este espacio.</p></article>
      <article class="note note-pink"><span class="note-pin" aria-hidden="true"></span>
        <p class="note-kicker">RECUERDA</p><h3>Un paso a la vez</h3>
        <p>Organiza tus entregas y cumple tus objetivos poco a poco.</p></article>
      <article class="note note-lilac"><span class="note-pin" aria-hidden="true"></span>
        <p class="note-kicker">CONSEJO</p><h3>Prioriza tus tareas</h3>
        <p>Comienza por las actividades más próximas o importantes.</p></article>`;
    return;
  }

  const colors = ['note-yellow', 'note-pink', 'note-lilac'];
  upcomingList.innerHTML = upcoming.map((activity, index) => `
    <article class="note ${colors[index]}">
      <span class="note-pin" aria-hidden="true"></span>
      <p class="note-kicker">${escapeText(activity.priority.toUpperCase())} · PENDIENTE</p>
      <h3>${escapeText(activity.title)}</h3>
      <p>${escapeText(activity.subject)}</p>
      <span class="note-date">Entrega: ${formatDate(activity.dueDate)}</span>
    </article>`).join('');
}

/* ------------------------- REGISTRO: formulario ------------------------- */

function setupRegistration() {
  const form = document.getElementById('activity-form');
  if (!form) return;

  const fields = {
    id: document.getElementById('activity-id'),
    title: document.getElementById('activity-title'),
    subject: document.getElementById('activity-subject'),
    date: document.getElementById('activity-date'),
    priority: document.getElementById('activity-priority'),
    description: document.getElementById('activity-description')
  };

  const errorElements = {
    title: document.getElementById('title-error'),
    subject: document.getElementById('subject-error'),
    date: document.getElementById('date-error')
  };

  const feedback = document.getElementById('form-feedback');
  const submitButton = document.getElementById('save-activity-button');
  const pageTitle = document.getElementById('form-page-title');
  const formHeading = document.getElementById('activity-form-heading');

  function clearErrors() {
    Object.values(errorElements).forEach((element) => { element.textContent = ''; });
  }

  function validateForm() {
    clearErrors();
    let isValid = true;

    if (fields.title.value.trim().length < 3) {
      errorElements.title.textContent = 'El título debe tener al menos 3 caracteres.';
      isValid = false;
    }
    if (fields.subject.value.trim().length < 2) {
      errorElements.subject.textContent = 'Escribe el nombre de la asignatura.';
      isValid = false;
    }
    if (!fields.date.value) {
      errorElements.date.textContent = 'Selecciona una fecha de entrega.';
      isValid = false;
    }

    if (!isValid) {
      const firstInvalid = Object.values(errorElements).find((element) => element.textContent);
      if (firstInvalid) {
        const input = document.getElementById(firstInvalid.id.replace('-error', '').replace('title', 'activity-title'));
        if (firstInvalid === errorElements.title) fields.title.focus();
        else if (firstInvalid === errorElements.subject) fields.subject.focus();
        else fields.date.focus();
      }
    }
    return isValid;
  }

  // Si la URL contiene ?editar=ID, se cargan los datos para modificarlos.
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('editar');
  if (editId) {
    const activity = getActivities().find((item) => item.id === editId);
    if (activity) {
      fields.id.value = activity.id;
      fields.title.value = activity.title;
      fields.subject.value = activity.subject;
      fields.date.value = activity.dueDate;
      fields.priority.value = activity.priority;
      fields.description.value = activity.description;
      submitButton.textContent = 'Guardar cambios';
      pageTitle.textContent = 'Editar actividad';
      formHeading.textContent = 'Modificar detalles de la actividad';
    } else {
      feedback.textContent = 'No se encontró la actividad que deseas editar.';
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    feedback.textContent = '';
    if (!validateForm()) return;

    const data = {
      title: fields.title.value,
      subject: fields.subject.value,
      dueDate: fields.date.value,
      priority: fields.priority.value,
      description: fields.description.value
    };

    const activities = getActivities();
    if (fields.id.value) {
      const updatedActivities = activities.map((activity) => {
        if (activity.id === fields.id.value) {
          return { ...activity, ...data, title: data.title.trim(), subject: data.subject.trim(), description: data.description.trim() };
        }
        return activity;
      });
      saveActivities(updatedActivities);
      feedback.textContent = '¡La actividad se actualizó correctamente!';
    } else {
      activities.push(createActivity(data));
      saveActivities(activities);
      feedback.textContent = '¡La actividad se registró correctamente!';
    }

    form.reset();
    fields.id.value = '';
    submitButton.textContent = 'Registrar actividad';
    if (pageTitle) pageTitle.textContent = 'Registrar nueva actividad';
    if (formHeading) formHeading.textContent = 'Detalles de la actividad';
    clearErrors();
    window.setTimeout(() => { window.location.href = 'tareas.html'; }, 700);
  });

  form.addEventListener('reset', () => {
    window.setTimeout(() => {
      fields.id.value = '';
      clearErrors();
      feedback.textContent = '';
      submitButton.textContent = 'Registrar actividad';
      if (pageTitle) pageTitle.textContent = 'Registrar nueva actividad';
      if (formHeading) formHeading.textContent = 'Detalles de la actividad';
    }, 0);
  });
}

/* ------------------------- TAREAS: consulta y administración ------------------------- */

function setupActivitiesPage() {
  const list = document.getElementById('activities-list');
  if (!list) return;

  const searchInput = document.getElementById('activity-search');
  const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
  const resultsMessage = document.getElementById('results-message');
  let activeFilter = 'todas';

  function updateCounts(activities) {
    document.getElementById('count-all').textContent = activities.length;
    document.getElementById('count-pending').textContent = activities.filter((item) => !item.completed).length;
    document.getElementById('count-completed').textContent = activities.filter((item) => item.completed).length;
  }

  function render() {
    const activities = getActivities();
    updateCounts(activities);

    const searchTerm = searchInput.value.trim().toLocaleLowerCase('es');
    const filtered = activities.filter((activity) => {
      const matchesFilter = activeFilter === 'todas'
        || (activeFilter === 'pendientes' && !activity.completed)
        || (activeFilter === 'completadas' && activity.completed);
      const searchableText = `${activity.title} ${activity.subject} ${activity.description}`.toLocaleLowerCase('es');
      return matchesFilter && searchableText.includes(searchTerm);
    }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    if (filtered.length === 0) {
      const message = activities.length === 0
        ? 'Aún no tienes actividades registradas.'
        : 'No se encontraron actividades con esos criterios.';
      list.innerHTML = `<div class="empty-state"><span aria-hidden="true">🌷</span>
        <h3>${message}</h3><p>Prueba otra búsqueda o registra una nueva actividad.</p>
        <a class="button button-primary" href="registro.html">Registrar actividad</a></div>`;
      resultsMessage.textContent = '0 actividades mostradas.';
      return;
    }

    list.innerHTML = filtered.map((activity) => `
      <article class="activity-card ${activity.completed ? 'is-completed' : ''}">
        <div class="activity-info">
          <h3 class="activity-title">${escapeText(activity.title)}</h3>
          <div class="activity-meta">
            <span>${escapeText(activity.subject)}</span>
            <span>Entrega: ${formatDate(activity.dueDate)}</span>
            <span class="priority ${priorityClass(activity.priority)}">${escapeText(activity.priority)} prioridad</span>
            <span class="status ${activity.completed ? 'status-done' : 'status-pending'}">${activity.completed ? 'Completada' : 'Pendiente'}</span>
          </div>
          ${activity.description ? `<p class="activity-description">${escapeText(activity.description)}</p>` : ''}
        </div>
        <div class="activity-actions">
          <button class="action-button" type="button" data-action="toggle" data-id="${activity.id}">
            ${activity.completed ? 'Reabrir' : 'Completar'}
          </button>
          <button class="action-button" type="button" data-action="edit" data-id="${activity.id}">Editar</button>
          <button class="action-button delete" type="button" data-action="delete" data-id="${activity.id}">Eliminar</button>
        </div>
      </article>`).join('');

    resultsMessage.textContent = `${filtered.length} ${filtered.length === 1 ? 'actividad mostrada' : 'actividades mostradas'}.`;
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      filterButtons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle('active', isActive);
        item.setAttribute('aria-pressed', String(isActive));
      });
      render();
    });
  });

  searchInput.addEventListener('input', render);

  list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const { action, id } = button.dataset;
    const activities = getActivities();
    const activity = activities.find((item) => item.id === id);
    if (!activity) return;

    if (action === 'toggle') {
      const updated = activities.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      saveActivities(updated);
      render();
    }

    if (action === 'edit') {
      window.location.href = `registro.html?editar=${encodeURIComponent(id)}`;
    }

    if (action === 'delete') {
      const confirmed = window.confirm(`¿Seguro que deseas eliminar "${activity.title}"?`);
      if (confirmed) {
        saveActivities(activities.filter((item) => item.id !== id));
        render();
      }
    }
  });

  render();
}

/* ------------------------- Inicialización ------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  setupMenu();

  const page = document.body.dataset.page;
  if (page === 'inicio') renderDashboard();
  if (page === 'registro') setupRegistration();
  if (page === 'tareas') setupActivitiesPage();
});
