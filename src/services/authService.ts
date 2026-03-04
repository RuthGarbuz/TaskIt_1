const API_BASE_URL = "https://localhost:7282/api";

type LoginResult = {
  success: boolean;
  message: string;
  data?: unknown;
};

class AuthService {
  [x: string]: any;

  async login(email: string, password: string, rememberMe: boolean): Promise<LoginResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/Auth/login`, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          message: error,
        };
      }

      const data = await response.json();

      this.setToken(data.token);

      const userObject = {
        id: data.id,
        email: data.email,
        username: data.username,
        dataBase: data.dataBase,
        urlConnection: data.urlConnection,
        expiresAt: data.expiration,
        seeFinance: data.seeFinance,
        allowAddReport: data.allowAddReport,
        password: password,
        rememberMe: rememberMe,
      };

      if (rememberMe) {
        localStorage.setItem("user", JSON.stringify(userObject));
      } else {
        sessionStorage.setItem("user", JSON.stringify(userObject));
        localStorage.removeItem("user");
      }

      return {
        success: response.ok,
        message: data.message,
        data: data.data,
      };
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  logout(): void {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
  }

  getToken(): string | null {
    return localStorage.getItem("token");
  }

  setToken(token: string): void {
    localStorage.setItem("token", token);
  }

  getCurrentUser(): any | null {
    const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  getCurrentEmployee(): any | null {
    const employeeStr = localStorage.getItem("employee");
    return employeeStr ? JSON.parse(employeeStr) : null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();

    if (!token || !user) return false;

    const expiresAt = new Date(user.expiresAt);
    return expiresAt > new Date();
  }

  async makeAuthenticatedRequest(
    url: string | URL | Request,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = this.getToken();

    if (!token) {
      throw new Error("No authentication token found");
    }

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: authHeaders,
      });

      if (response.status === 401) {
        this.logout();
        throw new Error("Session expired. Please login again.");
      }

      return response;
    } catch (error) {
      console.error("Authenticated request error:", error);
      throw error;
    }
  }
}

export default new AuthService();
