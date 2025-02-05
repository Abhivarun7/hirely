import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Mail } from 'lucide-react';

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    mail: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target; // Extract name and value from the input field
    setFormData({ ...formData, [name]: value }); // Dynamically update the correct field in formData
    setError(''); // Reset any error
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    try {
      // Check if the password and confirm password match (only for registration)
      if (!isLogin && formData.password !== formData.confirmPassword) {
        throw new Error("Passwords don't match");
      }
  
      // Construct the user data
      const data = {
        name: formData.name,
        mail: formData.mail,
        password: formData.password,
        phoneNumber: isLogin ? undefined : null,
        location: isLogin ? undefined : null,
        pic: isLogin ? undefined : null,
        resume: isLogin ? undefined : null,
      };
  
      // Send the data as JSON in the request body
      const response = await axios.post(
        `http://localhost:3000/api/users/${isLogin ? 'login' : 'add'}`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
  
      if (response.data) {
        localStorage.setItem('userloginDetails', JSON.stringify(response.data));
        navigate('/userdashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl shadow-2xl border border-purple-500/20">
      <div>
        <h2 className="mt-6 text-purple-500 text-center text-3xl font-extrabold text-gray-100">
          {isLogin ? 'Sign in to Hirely' : 'Create your account'}
        </h2>
      </div>


        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            {!isLogin && (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    name="name"
                    type="text"
                    required={!isLogin}
                    placeholder="Full Name"
                    value={formData.name} // Bind to formData.name
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-12 py-3 bg-gray-700 border border-gray-600 placeholder-gray-400 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                name="mail"
                type="email"
                required
                placeholder="Email address"
                value={formData.mail} // Bind to formData.mail
                onChange={handleChange}
                className="appearance-none relative block w-full px-12 py-3 bg-gray-700 border border-gray-600 placeholder-gray-400 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                name="password"
                type="password"
                required
                placeholder="Password"
                value={formData.password} // Bind to formData.password
                onChange={handleChange}
                className="appearance-none relative block w-full px-12 py-3 bg-gray-700 border border-gray-600 placeholder-gray-400 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {!isLogin && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  name="confirmPassword"
                  type="password"
                  required={!isLogin}
                  placeholder="Confirm Password"
                  value={formData.confirmPassword} // Bind to formData.confirmPassword
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-12 py-3 bg-gray-700 border border-gray-600 placeholder-gray-400 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
