import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IndexPage from "./components/landingpage/index"; // Import the component correctly
import ClientSignup from "./components/client/client_signup/signup";
import ClientLogin from "./components/client/client_login/login";
import ClientDashboard from "./components/client/client_dashboard/index";
import Login from "./components/user/login_signup/Authpage";
import UserDashboard from "./components/user/index";



const App = () => {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/user_login" element={<Login />} />
          <Route path="/client_signup" element={<ClientSignup />} />
          <Route path="/client_login" element={<ClientLogin />} />
          <Route path="/client_dashboard" element={<ClientDashboard />} />
          <Route path="/userdashboard" element={<UserDashboard />} />
          <Route path="*" element={<Navigate to="/index" />} /> 
          <Route path="/index" element={<IndexPage />} /> {/* Add the route for the IndexPage component */}
        </Routes>
      </div>
    </Router>
  )
}

export default App;