import { useState } from 'react';
import authService from '../../services/authService';

interface LoginProps {
  onLogin: (username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  //const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    // כאן תוכל להוסיף לוגיקת התחברות אמיתית
      try {
          const result = await authService.login(username, password, false);
          
          if (result.success) {
            const user = authService.getCurrentUser();
            if (user && user.username) {
                onLogin(user.username);
            }
          } else {
            alert(result.message || 'שגיאה בהתחברות');
          }
        } catch (error) {
          console.error('Login error:', error);
          alert('שגיאה בהתחברות למערכת');
        }
   
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-bold">Ti</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ברוכים הבאים ל-TaskIt</h1>
          <p className="text-gray-500">מערכת ניהול משימות חכמה</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">שם משתמש</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="הזן שם משתמש"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="הזן סיסמה"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          
          <button
            onClick={handleLogin}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
          >
            התחבר
          </button>
        </div>
      </div>
    </div>
  );
}