import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type TourContextValue = {
  tourOpen: boolean;
  setTourOpen: (open: boolean) => void;
  openTour: () => void;
};

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const [tourOpen, setTourOpen] = useState(false);
  const openTour = useCallback(() => setTourOpen(true), []);

  return (
    <TourContext.Provider value={{ tourOpen, setTourOpen, openTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}
