import type { Dispatch } from 'react';
import type { MeetingAction, MeetingState } from '../types';

interface MeetingControlsProps {
  state: MeetingState;
  dispatch: Dispatch<MeetingAction>;
}

const MeetingControls = ({ state, dispatch }: MeetingControlsProps) => {
  const nowPayload = () => ({ now: Date.now() });
  const isRunning = state.status === 'running';
  const isPaused = state.status === 'paused';
  const isOffTopic = isRunning && state.activeItemId === null;

  return (
    <section className="panel controls" aria-label="Meeting controls">
      <div className="status-pill">{state.status}</div>
      <div className="button-row">
        {isRunning && (
          <button type="button" onClick={() => dispatch({ type: 'PAUSE_MEETING', payload: nowPayload() })}>
            Pause
          </button>
        )}
        {isPaused && (
          <button type="button" className="primary" onClick={() => dispatch({ type: 'RESUME_MEETING', payload: nowPayload() })}>
            Resume
          </button>
        )}
        {isRunning && !isOffTopic && (
          <button type="button" onClick={() => dispatch({ type: 'START_OFF_TOPIC', payload: nowPayload() })}>
            Off-topic
          </button>
        )}
        {isRunning && isOffTopic && (
          <button type="button" onClick={() => dispatch({ type: 'STOP_OFF_TOPIC', payload: nowPayload() })}>
            Back to agenda
          </button>
        )}
        {isRunning && state.activeItemId && (
          <button type="button" className="primary" onClick={() => dispatch({ type: 'COMPLETE_AGENDA_ITEM', payload: nowPayload() })}>
            Complete topic
          </button>
        )}
        {state.status !== 'ended' && state.status !== 'setup' && (
          <button type="button" className="danger" onClick={() => dispatch({ type: 'END_MEETING', payload: nowPayload() })}>
            End
          </button>
        )}
        {state.status === 'ended' && (
          <button type="button" className="primary" onClick={() => dispatch({ type: 'RESET_MEETING' })}>
            Set up next meeting
          </button>
        )}
      </div>
    </section>
  );
};

export default MeetingControls;
