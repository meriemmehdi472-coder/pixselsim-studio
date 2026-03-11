// hooks/useHistory.js
//
// Gestion générique de l'historique undo/redo.
// Stocke un tableau d'états et un index courant.
// push() ajoute un état, undo/redo déplacent l'index.
//
import { useState, useRef, useCallback } from "react";

export function useHistrq(initial) {
  const [index, setIndex]     = useState(0);
  const [history, setHistory] = useState([initial]);
  const histRef = useRef([initial]);
  const idxRef  = useRef(0);

  const push = useCallback((s) => {
    // Écrase les états "futurs" quand on fait une nouvelle action après un undo
    const next = [...histRef.current.slice(0, idxRef.current + 1), s];
    histRef.current = next; idxRef.current = next.length - 1;
    setHistory([...next]); setIndex(next.length - 1);
  }, []);

  const undo = useCallback(() => {
    const i = Math.max(0, idxRef.current - 1);
    idxRef.current = i; setIndex(i);
  }, []);

  const redo = useCallback(() => {
    const i = Math.min(histRef.current.length - 1, idxRef.current + 1);
    idxRef.current = i; setIndex(i);
  }, []);

  return {
    current:  history[index],
    push, undo, redo,
    canUndo:  index > 0,
    canRedo:  index < history.length - 1,
  };
}