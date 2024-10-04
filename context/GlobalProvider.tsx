import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getCurrentUser } from "../lib/appwrite";

// Define the interface for the context
interface GlobalContextType {
  isLogged: boolean;
  setIsLogged: React.Dispatch<React.SetStateAction<boolean>>;
  user: any; // Adjust the type of 'user' if you have a specific type
  setUser: React.Dispatch<React.SetStateAction<any>>; // Adjust type of 'any' based on user type
  loading: boolean;
}

// Set default values as undefined
const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const useGlobalContext = (): GlobalContextType => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};

interface GlobalProviderProps {
  children: ReactNode;
}

const GlobalProvider = ({ children }: GlobalProviderProps) => {
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null); // Adjust the type of 'user' if needed
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res) {
          setIsLogged(true);
          setUser(res);
        } else {
          setIsLogged(false);
          setUser(null);
        }
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <GlobalContext.Provider value={{ isLogged, setIsLogged, user, setUser, loading }}>
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
