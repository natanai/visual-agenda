import type { Dispatch } from 'react';
import type { MeetingAction, MeetingState, VisualCalculation } from '../types';
import AgendaItemBlock from './AgendaItemBlock';
import OffTopicBlock from './OffTopicBlock';

interface AgendaStackProps {
  state: MeetingState;
  calculation: VisualCalculation;
  dispatch: Dispatch<MeetingAction>;
  showSetupAddButton?: boolean;
}

const AgendaStack = ({ state, calculation, dispatch, showSetupAddButton = false }: AgendaStackProps) => (
  <section className="panel stack-panel" aria-labelledby="stack-heading">
    <div className="panel-heading">
      <p className="eyebrow">Visual stack</p>
      <h2 id="stack-heading">Time allocation</h2>
    </div>
    <div className="agenda-stack">
      {calculation.blocks.length === 0 && (
        <div className="empty-stack">
          <strong>No agenda items yet.</strong>
          <span>Add one to start shaping the meeting.</span>
        </div>
      )}
      {calculation.blocks.map((block) =>
        block.kind === 'offTopic' ? (
          <OffTopicBlock key={block.id} block={block} />
        ) : (
          <AgendaItemBlock key={block.id} block={block} state={state} dispatch={dispatch} />
        )
      )}
      {showSetupAddButton && (
        <button type="button" className="add-in-stack" onClick={() => dispatch({ type: 'ADD_AGENDA_ITEM' })}>
          + Add agenda item
        </button>
      )}
    </div>
  </section>
);

export default AgendaStack;
