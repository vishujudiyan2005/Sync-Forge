import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Register } from "./pages/Register"
import ProtectedRouter from "./middleware/ProtectedRouter";
import { CodeEditor } from "./pages/CodeEditor";
import { Home } from "./pages/Home";
import { ThemeProvider } from "./contexts/ThemeContext";

const App = ()=>{
 
  return (
    <ThemeProvider>
      <BrowserRouter>
      <Routes>
        <Route path="/:roomId" element={<Register />} />
        <Route path="/" element = {<Home/>}/>
        <Route path="/start" element={<Register />} />
        <Route path="/code/:roomId" element = {<ProtectedRouter><CodeEditor/></ProtectedRouter>}/>
      </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App;
