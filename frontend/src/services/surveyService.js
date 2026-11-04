import { api, BASE_URL, request } from './api.js';

const unwrap = (res) => res.data;

export const surveyApi = {
  listActive: () => api.get('/surveys').then(unwrap),
  getPublic: (id) => api.get(`/surveys/${id}`).then(unwrap),

  listAll: () => api.get('/surveys/all').then(unwrap),
  getAdmin: (id) => api.get(`/surveys/${id}/admin`).then(unwrap),
  stats: () => api.get('/surveys/stats').then(unwrap),
  create: (data) => api.post('/surveys', data).then(unwrap),
  update: (id, data) => api.put(`/surveys/${id}`, data).then(unwrap),
  remove: (id) => api.delete(`/surveys/${id}`),
  setCover: (id, blob) => api.putBlob(`/surveys/${id}/cover`, blob).then(unwrap),
  removeCover: (id) => api.delete(`/surveys/${id}/cover`).then(unwrap),
};

// Public URL of a survey's cover image, or null. The version query busts the cache after a new upload.
export const coverUrl = (survey) =>
  survey?.coverUpdatedAt
    ? `${BASE_URL}/surveys/${survey.id}/cover?v=${new Date(survey.coverUpdatedAt).getTime()}`
    : null;

export const questionApi = {
  list: (surveyId) => api.get(`/questions?surveyId=${surveyId}`).then(unwrap),
  create: (data) => api.post('/questions', data).then(unwrap),
  update: (id, data) => api.put(`/questions/${id}`, data).then(unwrap),
  remove: (id) => api.delete(`/questions/${id}`),
  reorder: (surveyId, ids) => api.put('/questions/reorder', { surveyId, ids }).then(unwrap),
};

export const responseApi = {
  submit: ({ surveyId, answers, respondentName, respondentToken }) =>
    request('/responses', { method: 'POST', body: { surveyId, answers, respondentName }, respondentToken }).then(
      unwrap,
    ),
  status: (surveyId, respondentToken) =>
    request(`/responses/status?surveyId=${surveyId}`, { respondentToken }).then(unwrap),
  allowResubmit: (id) => api.post(`/responses/${id}/allow-resubmit`).then(unwrap),

  list: (surveyId, { page = 1, pageSize = 20 } = {}) =>
    api.get(`/responses?surveyId=${surveyId}&page=${page}&pageSize=${pageSize}`),
  report: (surveyId) => api.get(`/responses/report/${surveyId}`).then(unwrap),
  remove: (id) => api.delete(`/responses/${id}`),

  async downloadCsv(surveyId, lang = 'en') {
    const blob = await request(`/responses/export/${surveyId}?lang=${lang}`, { responseType: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `survey-${surveyId}-responses.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

export const telegramApi = {
  getSettings: () => api.get('/telegram/settings').then(unwrap),
  saveSettings: (data) => api.put('/telegram/settings', data).then(unwrap),
  sendTest: (data) => api.post('/telegram/test', data).then(unwrap),
};
