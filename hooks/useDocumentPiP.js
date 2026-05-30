'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { copyStylesToWindow, isDocumentPiPSupported, requestDocumentPiPWindow } from '@/lib/documentPiP';

function emptyPipState() {
  return { rooms: [], active: null };
}

export function useDocumentPiP() {
  const [pipState, setPipState] = useState(emptyPipState);
  const pipWindowRef = useRef(null);
  const pipRootRef = useRef(null);
  const pipRootMountedRef = useRef(false);

  const destroyPiPWindow = useCallback(() => {
    pipRootMountedRef.current = false;
    const root = pipRootRef.current;
    pipRootRef.current = null;

    if (root) {
      queueMicrotask(() => {
        try {
          root.unmount();
        } catch {
          /* ignore */
        }
      });
    }

    const pipWindow = pipWindowRef.current;
    pipWindowRef.current = null;

    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }
  }, []);

  const closePiP = useCallback((roomName) => {
    setPipState((prev) => {
      const rooms = roomName
        ? prev.rooms.filter((name) => name !== roomName)
        : [];

      if (rooms.length === 0) {
        destroyPiPWindow();
        return emptyPipState();
      }

      const active = prev.active === roomName || !rooms.includes(prev.active)
        ? rooms[rooms.length - 1]
        : prev.active;

      return { rooms, active };
    });
  }, [destroyPiPWindow]);

  const setActivePipRoom = useCallback((roomName) => {
    setPipState((prev) => {
      if (!prev.rooms.includes(roomName)) return prev;
      return { ...prev, active: roomName };
    });
  }, []);

  const ensurePiPWindow = useCallback(async () => {
    let pipWindow = pipWindowRef.current;
    if (pipWindow && !pipWindow.closed) {
      return pipWindow;
    }

    pipWindow = await requestDocumentPiPWindow();
    pipWindowRef.current = pipWindow;
    copyStylesToWindow(pipWindow);

    pipWindow.document.body.replaceChildren();
    const container = pipWindow.document.createElement('div');
    container.id = 'pip-root';
    container.style.cssText = 'flex:1;min-height:0;height:100%;display:flex;flex-direction:column;overflow:hidden;';
    pipWindow.document.body.appendChild(container);

    pipRootRef.current = createRoot(container);
    pipRootMountedRef.current = true;

    pipWindow.addEventListener('pagehide', () => {
      destroyPiPWindow();
      setPipState(emptyPipState());
    }, { once: true });

    return pipWindow;
  }, [destroyPiPWindow]);

  const openPiP = useCallback(async (roomName) => {
    if (!roomName) return;

    await ensurePiPWindow();

    setPipState((prev) => {
      const rooms = prev.rooms.includes(roomName)
        ? prev.rooms
        : [...prev.rooms, roomName];
      return { rooms, active: roomName };
    });
  }, [ensurePiPWindow]);

  const updatePiPContent = useCallback((element) => {
    const root = pipRootRef.current;
    const pipWindow = pipWindowRef.current;

    if (!root || !pipRootMountedRef.current || !pipWindow || pipWindow.closed) {
      return;
    }

    try {
      root.render(element);
    } catch {
      /* root już odmontowany */
    }
  }, []);

  useEffect(() => {
    if (!isDocumentPiPSupported()) return undefined;

    const pipApi = window.documentPictureInPicture;
    const onLeave = () => {
      destroyPiPWindow();
      setPipState(emptyPipState());
    };

    pipApi.addEventListener('leave', onLeave);

    return () => {
      pipApi.removeEventListener('leave', onLeave);
      destroyPiPWindow();
    };
  }, [destroyPiPWindow]);

  return {
    pipRooms: pipState.rooms,
    activePipRoom: pipState.active,
    setActivePipRoom,
    openPiP,
    closePiP,
    updatePiPContent,
    isPiPSupported: isDocumentPiPSupported(),
  };
}
