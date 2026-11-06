import { useContext } from 'react';
import AppContext from './appContextStore';

export default function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used inside AppProvider.');
  return context;
}
