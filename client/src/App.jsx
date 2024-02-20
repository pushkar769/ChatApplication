import React from "react"
import axios from "axios";
import { UserContextProvider } from "./UserContext.jsx";
import Routes from "./Routes.jsx";

function App() {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
  axios.defaults.withCredentials = true;

  return (
    <UserContextProvider>
      <Routes/>
    </UserContextProvider>
  )
}

export default App
