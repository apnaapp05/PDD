// src/lib/api.ts
import axios from "axios";

const API_URL = "http://localhost:8000"; 

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AuthAPI = {
  login: async (email, password) => {
    const params = new URLSearchParams();
    params.append("username", email.toLowerCase().trim());
    params.append("password", password);
    return api.post("/auth/login", params, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  },
  register: async (userData) => api.post("/auth/register", { ...userData, email: userData.email.toLowerCase().trim() }),
  
  // FIX: Changed to accept two separate arguments to match your Frontend calls
  verifyOtp: async (email: string, otp: string) => api.post("/auth/verify-otp", { 
    email: email.toLowerCase().trim(), 
    otp: otp.trim() 
  }),
  
  getMe: async () => api.get("/auth/me"),
  getVerifiedHospitals: async () => api.get("/auth/hospitals"),
  
  // Doctor List for Manual Booking
  getDoctors: async () => api.get("/doctors"),
};

export default api;