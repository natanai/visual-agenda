import type { Dispatch } from 'react';
import type { MeetingAction, MeetingState } from '../types';

interface CustomizerPanelProps {
  state: MeetingState;
  dispatch: Dispatch<MeetingAction>;
}

const CustomizerPanel = ({ state, dispatch }: CustomizerPanelProps) => (
  <section className="panel customizer" aria-labelledby="customizer-heading">
    <div className="panel-heading">
      <p className="eyebrow">Theme</p>
      <h2 id="customizer-heading">Customize display</h2>
    </div>
    <label className="field" htmlFor="accent-color">
      <span>Accent</span>
      <input id="accent-color" type="color" value={state.theme.accentColor} onChange={(event) => dispatch({ type: 'UPDATE_THEME', payload: { accentColor: event.target.value } })} />
    </label>
    <label className="field" htmlFor="background-color">
      <span>Background</span>
      <input id="background-color" type="color" value={state.theme.backgroundColor} onChange={(event) => dispatch({ type: 'UPDATE_THEME', payload: { backgroundColor: event.target.value } })} />
    </label>
    <label className="field" htmlFor="panel-color">
      <span>Panels</span>
      <input id="panel-color" type="color" value={state.theme.panelColor} onChange={(event) => dispatch({ type: 'UPDATE_THEME', payload: { panelColor: event.target.value } })} />
    </label>
    <label className="checkbox-field" htmlFor="compact-mode">
      <input id="compact-mode" type="checkbox" checked={state.theme.compactMode} onChange={(event) => dispatch({ type: 'UPDATE_THEME', payload: { compactMode: event.target.checked } })} />
      <span>Compact mode</span>
    </label>
  </section>
);

export default CustomizerPanel;
