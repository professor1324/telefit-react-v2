/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useHistory } from "react-router-dom";

// eslint-disable-next-line react/prop-types
const ProtectedRoute = ({component: Component}) => {

    const location = useHistory();
    const authentication = getAuth();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      onAuthStateChanged(authentication, (user) => {
        setIsLoading(true);

        if (user) {
          setIsLoading(false);
          setIsLoggedIn(true);
        } 
        else {
          window.location.href = "/login";
        }
        
      });
      
    },[]);

    return (
      <>
        {isLoading && <p>Loading...</p>}
        {isLoggedIn && (<Component />)}
      </>
    );
}
 
export default ProtectedRoute;