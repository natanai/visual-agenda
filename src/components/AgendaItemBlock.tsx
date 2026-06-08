import type { Dispatch } from 'react';
import type { MeetingAction, MeetingState, VisualBlock } from '../types';
import { formatDuration } from '../utils/time';

interface AgendaItemBlockProps {
  block: VisualBlock;
  state: MeetingState;
  dispatch: Dispatch<MeetingAction>;
}

const AgendaItemBlock = ({ block, state, dispatch }: AgendaItemBlockProps) => (
  <article
    className={`agenda-block ${block.status}`}
    style={{ minHeight: `${block.heightPercent}%`, borderColor: block.color, background: `${block.color}26` }}
  >
    <div>
      <strong>{block.label}</strong>
      <span>{block.status}</span>
    </div>
    <p>
      Planned {formatDuration(block.plannedMs)} · elapsed {formatDuration(block.elapsedMs)} · remaining{' '}
      {formatDuration(block.remainingMs)}
    </p>
    {state.status === 'running' && block.itemId && block.status !== 'active' && (
      <button type="button" className="ghost" onClick={() => dispatch({ type: 'SET_ACTIVE_AGENDA_ITEM', payload: { id: block.itemId!, now: Date.now() } })}>
        Make active
      </button>
    )}
  </article>
);

export default AgendaItemBlock;
