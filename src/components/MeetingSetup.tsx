import type { Dispatch } from 'react';
import type { MeetingAction, MeetingState } from '../types';
import DurationInput from './DurationInput';

interface MeetingSetupProps {
  state: MeetingState;
  dispatch: Dispatch<MeetingAction>;
}

const MeetingSetup = ({ state, dispatch }: MeetingSetupProps) => (
  <section className="panel setup-panel" aria-labelledby="setup-heading">
    <div className="panel-heading">
      <p className="eyebrow">Setup</p>
      <h2 id="setup-heading">Plan the meeting</h2>
    </div>

    <label className="field" htmlFor="meeting-title">
      <span>Meeting title</span>
      <input
        id="meeting-title"
        value={state.title}
        onChange={(event) => dispatch({ type: 'UPDATE_MEETING_TITLE', payload: event.target.value })}
      />
    </label>

    <DurationInput
      id="total-duration"
      label="Total duration (minutes)"
      value={state.totalDurationMinutes}
      onChange={(value) => dispatch({ type: 'UPDATE_TOTAL_DURATION', payload: value ?? 1 })}
    />

    <div className="agenda-editor">
      {state.agendaItems.map((item, index) => (
        <div className="agenda-editor-row" key={item.id}>
          <input
            aria-label={`Topic ${index + 1} title`}
            value={item.title}
            onChange={(event) =>
              dispatch({ type: 'UPDATE_AGENDA_ITEM', payload: { id: item.id, patch: { title: event.target.value } } })
            }
          />
          <DurationInput
            id={`duration-${item.id}`}
            label="Minutes"
            value={item.durationMinutes}
            onChange={(durationMinutes) =>
              dispatch({ type: 'UPDATE_AGENDA_ITEM', payload: { id: item.id, patch: { durationMinutes } } })
            }
          />
          <input
            aria-label={`${item.title} color`}
            type="color"
            value={item.color}
            onChange={(event) =>
              dispatch({ type: 'UPDATE_AGENDA_ITEM', payload: { id: item.id, patch: { color: event.target.value } } })
            }
          />
          <div className="row-actions">
            <button type="button" className="ghost" onClick={() => dispatch({ type: 'MOVE_AGENDA_ITEM', payload: { id: item.id, direction: 'up' } })}>
              ↑
            </button>
            <button type="button" className="ghost" onClick={() => dispatch({ type: 'MOVE_AGENDA_ITEM', payload: { id: item.id, direction: 'down' } })}>
              ↓
            </button>
            <button type="button" className="danger" onClick={() => dispatch({ type: 'REMOVE_AGENDA_ITEM', payload: item.id })}>
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>

    <div className="button-row">
      <button type="button" onClick={() => dispatch({ type: 'ADD_AGENDA_ITEM' })}>
        Add topic
      </button>
      <button type="button" className="primary" disabled={state.agendaItems.length === 0} onClick={() => dispatch({ type: 'START_MEETING', payload: { now: Date.now() } })}>
        Start meeting
      </button>
    </div>
  </section>
);

export default MeetingSetup;
