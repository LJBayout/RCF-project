import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: number;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem("cfr_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("cfr_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Simple authentication (admin/admin)
    // In production: call API endpoint
    if (username === "admin" && password === "admin") {
      const user: User = {
        id: 1,
        username: "admin",
        role: "admin",
      };
      setUser(user);
      localStorage.setItem("cfr_user", JSON.stringify(user));
      
      // Log audit event via tRPC
      try {
        const { trpc } = await import("../lib/trpc");
        await trpc.auth.logLogin.mutate({ username });
      } catch (e) {
        console.error("Failed to log audit event:", e);
      }
      
      return true;
    }
    
    // Log failed attempt via tRPC
    try {
      const { trpc } = await import("../lib/trpc");
      await trpc.auth.logLoginFailed.mutate({ username });
    } catch (e) {
      console.error("Failed to log audit event:", e);
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("cfr_user");
    
    // Log audit event via tRPC
    import("../lib/trpc").then(({ trpc }) => {
      trpc.auth.logLogout.mutate().catch(e => console.error("Failed to log audit event:", e));
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
