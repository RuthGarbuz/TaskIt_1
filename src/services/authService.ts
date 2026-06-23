const API_BASE_URL = "https://localhost:7282/api";
//const API_BASE_URL = "http://localhost:7282/api"; // use this if HTTPS cert is not trusted locally
//const API_BASE_URL = "https://mpweba.master-plan.co.il/TaskItGlobalWebAPI/api";

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
        body: JSON.stringify({ email, username: email, password }),
      });

      // const responseText = await response.text();
      // let data: any = null;

      // if (responseText) {
      //   try {
      //     data = JSON.parse(responseText);
      //   } catch {
      //     data = null;
      //   }
      // }

      // if (!response.ok) {
      //   const errorMessage =
      //     data?.message ||
      //     responseText ||
      //     `Login failed (${response.status} ${response.statusText})`;

      //   return {
      //     success: false,
      //     message: errorMessage,
      //   };
      // }

      // if (!data || typeof data !== "object") {
      //   return {
      //     success: false,
      //     message: "Invalid login response format.",
      //   };
      // }

      // const token = data.token || data.accessToken;

      // if (!token) {
      //   return {
      //     success: false,
      //     message: data.message || "Login succeeded but token is missing.",
      //   };
      // }

      // this.setToken(token);
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
        id: data.id ?? data.Id,
        email: data.email ?? data.Email,
        username: data.username ?? data.Username ?? email,
        dataBase: data.dataBase ?? data.DataBase,
        urlConnection: data.urlConnection,
        expiresAt: data.expiration,
        seeFinance: data.seeFinance,
        allowAddReport: data.allowAddReport,
        password: password,
        rememberMe: rememberMe,
        permissionId: data.permissionId,
      };

      if (rememberMe) {
        localStorage.setItem("user", JSON.stringify(userObject));
      } else {
        sessionStorage.setItem("user", JSON.stringify(userObject));
        localStorage.removeItem("user");
      }

      return {
        success: response.ok,
        message: data.message || "Login successful",
        data: data.data,
      };
    } catch (error) {
      console.error("Login error:", error);
      const isFetchFailure =
        error instanceof TypeError &&
        /failed to fetch|networkerror|load failed/i.test(error.message || "");

      const message = isFetchFailure
        ? `Cannot reach login API (${API_BASE_URL}/Auth/login). Check HTTPS certificate trust, CORS policy, and that the API is running.`
        : error instanceof Error
          ? error.message
          : "Network error during login";

      return {
        success: false,
        message,
      };
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
  getPermissionId(): number | null {
    const user = this.getCurrentUser();
    if (!user || user.permissionId == null) return null;
    const id = user.permissionId;
    return typeof id === "number" ? id : Number(id);
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

    const headers = new Headers(options.headers ?? undefined);
    headers.set("Authorization", `Bearer ${token}`);

    const method = (options.method ?? "GET").toUpperCase();
    const hasBody = options.body != null && options.body !== "";
    if (hasBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    // No body: avoid Content-Type — ASP.NET returns 415 if JSON Content-Type is sent without a body
    if (!hasBody) {
      headers.delete("Content-Type");
    }
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        ...(hasBody ? { body: options.body } : {}),
        signal: options.signal,
        cache: options.cache,
        credentials: options.credentials,
        redirect: options.redirect,
        referrer: options.referrer,
        referrerPolicy: options.referrerPolicy,
        integrity: options.integrity,
        keepalive: options.keepalive,
        mode: options.mode,
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
