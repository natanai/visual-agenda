import { useEffect, useReducer } from 'react';
import AppShell from './components/AppShell';
import { initialState } from './state/initialState';
import { meetingReducer } from './state/meetingReducer';
import { loadPersistedSetup, savePersistedSetup } from './utils/storage';

const App = () => {
  const [state, dispatch] = useReducer(meetingReducer, initialState);

  useEffect(() => {
    const persisted = loadPersistedSetup();
    if (persisted) dispatch({ type: 'LOAD_PERSISTED_SETUP', payload: persisted });
  }, []);

  useEffect(() => {
    savePersistedSetup(state);
  }, [state.title, state.totalDurationMinutes, state.agendaItems, state.theme]);

  return <AppShell state={state} dispatch={dispatch} />;
};

export default App;
