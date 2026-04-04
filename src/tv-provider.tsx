"use client";

import { useEffect } from 'react';
import { init, useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';

export function TVProvider({ children }: { children: React.ReactNode }) {
  const { ref, focusKey } = useFocusable();

  useEffect(() => {
    // Khởi tạo điều hướng cho TV chỉ ở phía Client
    if (typeof window !== "undefined") {
      init({
        debug: false,
        visualDebug: false,
        throttle: 50,
      });
    }
  }, []);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="min-h-screen">
        {children}
      </div>
    </FocusContext.Provider>
  );
}