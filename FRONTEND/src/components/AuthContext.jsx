import {createContext, useEffect, useContext, useState} from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    const checkAuthStatus = async () => {
        try{
            const response = await fetch("http://localhost:3000/loggedIn/status", {
                method: "GET",
                credentials: "include"
            });
            const data = await response.json();

            if (response.ok && data.isLoggedIn){
                setUser(data.user);
            }
            else {
                setUser(null);
            }
        }
        catch(err){
            console.log(err);
            setUser(null);
        }
        finally {
            setLoading(false);
        }
    }


    useEffect(() => {
        checkAuthStatus();
    },[])

    return (
        <AuthContext.Provider value={{
        user,setUser,loading,checkAuthStatus}
        }>
            {!loading ? children : <div>Loading...</div>}
        </AuthContext.Provider>
    )
}