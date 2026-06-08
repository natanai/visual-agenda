import type { Dispatch } from 'react';
import type { MeetingAction, MeetingState, VisualCalculation } from '../types';
import AgendaItemBlock from './AgendaItemBlock';
import OffTopicBlock from './OffTopicBlock';

interface AgendaStackProps {
  state: MeetingState;
  calculation: VisualCalculation;
  dispatch: Dispatch<MeetingAction>;
}

const AgendaStack = ({ state, calculation, dispatch }: AgendaStackProps) => (
  <section className="panel stack-panel" aria-labelledby="stack-heading">
    <div className="panel-heading">
      <p className="eyebrow">Visual stack</p>
      <h2 id="stack-heading">Time allocation</h2>
    </div>
    <div className="agenda-stack">
      {calculation.blocks.map((block) =>
        block.kind === 'offTopic' ? (
          <OffTopicBlock key={block.id} block={block} />
        ) : (
          <AgendaItemBlock key={block.id} block={block} state={state} dispatch={dispatch} />
        )
      )}
    </div>
  </section>
);

export default AgendaStack;
