import { createContext, useEffect, useContext, useState, useCallback } from "react";

const API_URL = "http://localhost:3000";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/loggedIn/status`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok && data.isLoggedIn) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.log(err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      // ignore — we still clear local state
      console.log(err);
    }
    setUser(null);
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, checkAuthStatus, logout }}>
      {!loading ? children : <div>Loading...</div>}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
