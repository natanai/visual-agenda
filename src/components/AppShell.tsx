import type { CSSProperties, Dispatch } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { MeetingAction, MeetingState } from '../types';
import { calculateVisualBlocks } from '../utils/agendaMath';
import AgendaStack from './AgendaStack';
import CustomizerPanel from './CustomizerPanel';
import MeetingControls from './MeetingControls';
import MeetingSetup from './MeetingSetup';
import SummaryPanel from './SummaryPanel';

type ThemeStyle = CSSProperties & Record<'--accent' | '--background' | '--panel' | '--text', string>;

interface AppShellProps {
  state: MeetingState;
  dispatch: Dispatch<MeetingAction>;
}

const AppShell = ({ state, dispatch }: AppShellProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state.status !== 'running') {
      setNow(Date.now());
      return undefined;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state.status]);

  const calculation = useMemo(() => calculateVisualBlocks(state, now), [state, now]);
  const themeStyle = {
    '--accent': state.theme.accentColor,
    '--background': state.theme.backgroundColor,
    '--panel': state.theme.panelColor,
    '--text': state.theme.textColor
  } satisfies ThemeStyle;

  return (
    <main className={`app-shell ${state.theme.compactMode ? 'compact' : ''}`} style={themeStyle}>
      <header className="hero">
        <p className="eyebrow">Visual Agenda</p>
        <h1>{state.title}</h1>
        <p>See how agenda time stretches, shrinks, and shifts as the meeting unfolds.</p>
      </header>

      {state.status === 'setup' ? (
        <div className="layout dashboard">
          <div className="side-column">
            <MeetingSetup state={state} dispatch={dispatch} />
            <CustomizerPanel state={state} dispatch={dispatch} />
          </div>
          <AgendaStack state={state} calculation={calculation} dispatch={dispatch} showSetupAddButton />
        </div>
      ) : (
        <div className="layout dashboard">
          <div className="side-column">
            <MeetingControls state={state} dispatch={dispatch} />
            <SummaryPanel calculation={calculation} />
            <CustomizerPanel state={state} dispatch={dispatch} />
          </div>
          <AgendaStack state={state} calculation={calculation} dispatch={dispatch} />
        </div>
      )}
    </main>
  );
};

export default AppShell;
