import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { AuthApiError } from './api/auth';

const authApi = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('./api/auth', async () => {
  const actual = await vi.importActual('./api/auth');
  return {
    ...actual,
    getCurrentUser: authApi.getCurrentUser,
    login: authApi.login,
    logout: authApi.logout,
  };
});

beforeEach(() => {
  window.location.hash = '';
  vi.clearAllMocks();
  authApi.getCurrentUser.mockResolvedValue({
    id: 'user-1',
    email: 'owner@example.com',
    displayName: 'Owner',
    role: 'owner',
  });
  authApi.login.mockResolvedValue({
    user: {
      id: 'user-1',
      email: 'owner@example.com',
      displayName: 'Owner',
      role: 'owner',
    },
  });
  authApi.logout.mockResolvedValue(undefined);
});

test('renders the focused NVVAI welcome screen before the first message', async () => {
  render(<App />);

  expect(await screen.findByRole('heading', { name: /чем я могу помочь/i }))
    .toBeDefined();
  expect(screen.getByText('NVVAI')).toBeDefined();
  expect(screen.getByRole('button', { name: /объясни сложную тему/i }))
    .toBeDefined();
  expect(screen.queryByRole('log')).toBeNull();
});

test('navigates to the Leads workspace from the main navigation', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ leads: [] }),
  });

  render(<App />);
  await screen.findByRole('heading', { name: /чем я могу помочь/i });
  fireEvent.click(screen.getByRole('button', { name: 'Лиды' }));

  expect(window.location.hash).toBe('#leads');
  expect(await screen.findByRole('heading', { name: 'Лиды' })).toBeDefined();
  expect(fetchMock).toHaveBeenCalledWith(
    '/v1/leads',
    expect.objectContaining({ headers: { accept: 'application/json' } })
  );
  fetchMock.mockRestore();
});

test('supports selecting Agent mode in the chat workspace', async () => {
  render(<App />);

  await screen.findByRole('heading', { name: /чем я могу помочь/i });
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Show mode controls' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
  fireEvent.click(screen.getByRole('button', { name: 'Agent' }));

  expect(screen.getByText(/Mode:/)).toBeDefined();
  expect(screen.getByRole('button', { name: 'Agent' }).disabled).toBe(true);
});

test('fills the prompt when an example is selected', async () => {
  render(<App />);

  await screen.findByRole('heading', { name: /чем я могу помочь/i });
  fireEvent.click(
    screen.getByRole('button', { name: /объясни сложную тему/i })
  );

  expect(screen.getByRole('textbox').value)
    .toBe('Объясни сложную тему простыми словами');
});

test('keeps the protected application hidden until login succeeds', async () => {
  authApi.getCurrentUser.mockResolvedValue(null);
  authApi.login.mockResolvedValue({
    user: {
      id: 'user-1',
      email: 'owner@example.com',
      displayName: 'Owner',
      role: 'owner',
    },
  });

  render(<App />);

  expect(await screen.findByRole('heading', { name: /войти в nvvai/i }))
    .toBeDefined();
  expect(screen.queryByRole('heading', { name: /чем я могу помочь/i }))
    .toBeNull();

  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'owner@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Пароль'), {
    target: { value: 'correct horse battery staple' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

  expect(await screen.findByRole('heading', { name: /чем я могу помочь/i }))
    .toBeDefined();
  expect(authApi.login).toHaveBeenCalledWith({
    email: 'owner@example.com',
    password: 'correct horse battery staple',
  });
});

test('renders a safe login error without exposing authentication details', async () => {
  authApi.getCurrentUser.mockResolvedValue(null);
  const error = new AuthApiError(
    'Неверный email или пароль.',
    { status: 401, code: 'invalid_credentials' }
  );
  authApi.login.mockRejectedValue(error);

  render(<App />);
  await screen.findByRole('heading', { name: /войти в nvvai/i });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'owner@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Пароль'), {
    target: { value: 'correct horse battery staple' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

  expect((await screen.findByRole('alert')).textContent)
    .toBe('Неверный email или пароль.');
  expect(screen.queryByText(/argon|session|database|hash/i)).toBeNull();
});

test('logs out from the protected shell', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: /чем я могу помочь/i });

  fireEvent.click(screen.getByRole('button', { name: 'Выйти' }));

  expect(await screen.findByRole('heading', { name: /войти в nvvai/i }))
    .toBeDefined();
  expect(authApi.logout).toHaveBeenCalledTimes(1);
});

test('sends a message to the API and renders the reply', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ reply: 'Да, работает.' }),
  });

  render(<App />);
  await screen.findByRole('heading', { name: /чем я могу помочь/i });

  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Привет!' },
  });
  fireEvent.click(screen.getByRole('button', { name: /отправить/i }));

  expect(screen.queryByRole('heading', { name: /чем я могу помочь/i }))
    .toBeNull();
  expect(screen.getByRole('log')).toBeDefined();

  await waitFor(() => {
    expect(screen.getByText('Да, работает.')).toBeDefined();
  });

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/chat',
    expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Привет!' }),
    })
  );

  fetchMock.mockRestore();
});

test('starts voice recording when microphone button is pressed', async () => {
  const mediaRecorder = {
    start: vi.fn(),
    stop: vi.fn(),
    ondataavailable: null,
    onstop: null,
  };

  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [],
      }),
    },
  });

  globalThis.MediaRecorder = class {
    constructor() {
      return mediaRecorder;
    }
  };

  render(<App />);
  await screen.findByRole('heading', { name: /чем я могу помочь/i });

  fireEvent.click(
    screen.getByRole('button', { name: /микрофон/i })
  );

  await waitFor(() => {
    expect(mediaRecorder.start).toHaveBeenCalledTimes(1);
  });
});

test('passes recorded audio to the transcription callback when recording stops', async () => {
  const mediaRecorder = {
    start: vi.fn(),
    stop: vi.fn(),
    ondataavailable: null,
    onstop: null,
  };

  const audioBlob = new Blob(['audio'], {
    type: 'audio/webm',
  });

  const onAudioReady = vi.fn();

  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [],
      }),
    },
  });

  globalThis.MediaRecorder = class {
    constructor() {
      return mediaRecorder;
    }
  };

  render(<App onAudioReady={onAudioReady} />);
  await screen.findByRole('heading', { name: /чем я могу помочь/i });

  fireEvent.click(
    screen.getByRole('button', { name: /микрофон/i })
  );

  await waitFor(() => {
    expect(mediaRecorder.start).toHaveBeenCalledTimes(1);
  });

  fireEvent.click(
    screen.getByRole('button', { name: /остановить запись/i })
  );

  mediaRecorder.ondataavailable({
    data: audioBlob,
  });

  mediaRecorder.onstop();

  expect(onAudioReady).toHaveBeenCalledWith(audioBlob);
});

test('transcribes recorded audio into the message input', async () => {
  const mediaRecorder = {
    start: vi.fn(),
    stop: vi.fn(),
    ondataavailable: null,
    onstop: null,
    mimeType: 'audio/webm',
  };

  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      text: 'Распознанный текст',
    }),
  });

  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [],
      }),
    },
  });

  globalThis.MediaRecorder = class {
    constructor() {
      return mediaRecorder;
    }
  };

  render(<App />);
  await screen.findByRole('heading', { name: /чем я могу помочь/i });

  fireEvent.click(
    screen.getByRole('button', { name: /микрофон/i })
  );

  await waitFor(() => {
    expect(mediaRecorder.start).toHaveBeenCalledTimes(1);
  });

  fireEvent.click(
    screen.getByRole('button', { name: /остановить запись/i })
  );

  mediaRecorder.ondataavailable({
    data: new Blob(['audio'], { type: 'audio/webm' }),
  });

  await mediaRecorder.onstop();

  await waitFor(() => {
    expect(screen.getByRole('textbox').value)
      .toBe('Распознанный текст');
  });

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/transcribe',
    expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'audio/webm' },
      body: expect.any(Blob),
    })
  );

  fetchMock.mockRestore();
});
