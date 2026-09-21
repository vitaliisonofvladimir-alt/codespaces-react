import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

test('renders the focused NVVAI welcome screen before the first message', () => {
  window.location.hash = '';
  render(<App />);

  expect(screen.getByRole('heading', { name: /чем я могу помочь/i }))
    .toBeDefined();
  expect(screen.getByText('NVVAI')).toBeDefined();
  expect(screen.getByRole('button', { name: /объясни сложную тему/i }))
    .toBeDefined();
  expect(screen.queryByRole('log')).toBeNull();
});

test('navigates to the Leads workspace from the main navigation', async () => {
  window.location.hash = '';
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ leads: [] }),
  });

  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Лиды' }));

  expect(window.location.hash).toBe('#leads');
  expect(await screen.findByRole('heading', { name: 'Лиды' })).toBeDefined();
  expect(fetchMock).toHaveBeenCalledWith(
    '/v1/leads',
    expect.objectContaining({ headers: { accept: 'application/json' } })
  );
  fetchMock.mockRestore();
});

test('supports selecting Agent mode in the chat workspace', () => {
  window.location.hash = '';
  render(<App />);

  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Show mode controls' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
  fireEvent.click(screen.getByRole('button', { name: 'Agent' }));

  expect(screen.getByText(/Mode:/)).toBeDefined();
  expect(screen.getByRole('button', { name: 'Agent' }).disabled).toBe(true);
});

test('fills the prompt when an example is selected', () => {
  window.location.hash = '';
  render(<App />);

  fireEvent.click(
    screen.getByRole('button', { name: /объясни сложную тему/i })
  );

  expect(screen.getByRole('textbox').value)
    .toBe('Объясни сложную тему простыми словами');
});

test('sends a message to the API and renders the reply', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ reply: 'Да, работает.' }),
  });

  render(<App />);

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
