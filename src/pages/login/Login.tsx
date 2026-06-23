import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import authService from '../../services/authService';

interface LoginProps {
  onLogin: (username: string) => void;
}

const toHebrewLoginError = (message: string): string => {
  const text = message.trim();
  if (!text) return 'שגיאה בהתחברות. אנא נסה שוב.';
  if (/[\u0590-\u05FF]/.test(text)) return text;

  const normalized = text.toLowerCase();
  if (
    normalized.includes('invalid credentials')
    || normalized.includes('unauthorized')
    || normalized.includes('invalid username')
    || normalized.includes('invalid password')
    || normalized.includes('wrong password')
  ) {
    return 'שם משתמש או סיסמה שגויים. אנא בדוק את הפרטים ונסה שוב.';
  }
  if (normalized.includes('failed to fetch') || normalized.includes('cannot reach') || normalized.includes('network error')) {
    return 'לא ניתן להתחבר לשרת. ודא שהמערכת פעילה ונסה שוב.';
  }
  return 'שגיאה בהתחברות. אנא נסה שוב.';
};

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  //const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    setLoginError(null);

    if (!username.trim()) {
      setLoginError('יש להזין שם משתמש.');
      return;
    }
    if (!password) {
      setLoginError('יש להזין סיסמה.');
      return;
    }

    try {
      const result = await authService.login(username, password, false);

      if (result.success) {
        const user = authService.getCurrentUser();
        if (user) {
          onLogin(user.username || user.email || username);
        }
      } else {
        setLoginError(toHebrewLoginError(result.message));
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('שגיאה בהתחברות למערכת. אנא נסה שוב מאוחר יותר.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8"> 
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="PlanIt Logo" className="w-20 h-20 object-contain mx-auto mb-1 flex items-center justify-center" />
          {/* <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
        
            <span className="text-white text-2xl font-bold">Pi</span>
          </div> */}
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ברוכים הבאים ל-PlanIt</h1>
          <p className="text-gray-500">מערכת ניהול משימות חכמה</p>
        </div>
        
        {loginError && (
          <div
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-center"
            role="alert"
          >
            {loginError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">שם משתמש</label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (loginError) setLoginError(null);
              }}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="הזן שם משתמש"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">סיסמה</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="הזן סיסמה"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
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