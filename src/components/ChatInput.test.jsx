import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInput from './ChatInput';

describe('ChatInput voice input', () => {
  test('shows the recording state on the microphone button', () => {
    render(
      <ChatInput
        message=""
        setMessage={vi.fn()}
        onSubmit={vi.fn()}
        loading={false}
        onStartRecording={vi.fn()}
        recording
      />
    );

    expect(screen.getByRole('button', { name: /остановить запись/i }))
      .toBeDefined();
  });

  test('calls onStartRecording when microphone button is pressed', async () => {
    const user = userEvent.setup();
    const onStartRecording = vi.fn();

    render(
      <ChatInput
        message=""
        setMessage={vi.fn()}
        onSubmit={vi.fn()}
        loading={false}
        onStartRecording={onStartRecording}
      />
    );

    await user.click(
      screen.getByRole('button', { name: /микрофон/i })
    );

    expect(onStartRecording).toHaveBeenCalledTimes(1);
  });
});
