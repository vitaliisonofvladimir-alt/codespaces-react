import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

test('sends a message to the API and renders the reply', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ reply: 'Да, работает.' }),
  });

  render(<App />);

  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Привет!' },
  });
  fireEvent.click(screen.getByRole('button', { name: /отправить/i }));

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
    screen.getByRole('button', { name: /микрофон/i })
  );

  mediaRecorder.ondataavailable({
    data: audioBlob,
  });

  mediaRecorder.onstop();

  expect(onAudioReady).toHaveBeenCalledWith(audioBlob);
});
