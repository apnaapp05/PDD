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
  verifyOtp: async (data: { email: string; otp: string }) => api.post("/auth/verify-otp", { 
    email: data.email.toLowerCase().trim(), 
    otp: data.otp.trim() 
  }),
  getMe: async () => api.get("/auth/me"),
  updateProfile: async (data: { full_name: string; email: string; phone_number: string; address?: string }) => 
    api.put("/auth/profile", data),
  getVerifiedHospitals: async () => api.get("/auth/hospitals"),
};

export const AdminAPI = {
  getStats: async () => api.get("/admin/stats"),
  getDoctors: async () => api.get("/admin/doctors"),
  getOrganizations: async () => api.get("/admin/organizations"),
  getPatients: async () => api.get("/admin/patients"),
  approveAccount: async (id: number, type: "doctor" | "organization") => 
    api.post(`/admin/approve-account/${id}?type=${type}`),
  deleteEntity: async (id: number, type: "doctor" | "organization" | "patient") => 
    api.delete(`/admin/delete/${type}/${id}`),
};

export const OrganizationAPI = {
  getStats: async () => api.get("/organization/stats"),
  getDoctors: async () => api.get("/organization/doctors"),
  verifyDoctor: async (id: number) => api.post(`/organization/doctors/${id}/verify`),
  removeDoctor: async (id: number) => api.delete(`/organization/doctors/${id}`),
  getDetails: async () => api.get("/organization/details"),
  requestLocationChange: async (data: { address: string; pincode: string; lat: number; lng: number }) => 
    api.post("/organization/location-change", data),
  getAppointments: async () => api.get("/organization/appointments"),
  cancelAppointment: async (id: number) => api.put(`/organization/appointments/${id}/cancel`),
  getInventory: async () => api.get("/organization/inventory"),
};

export const DoctorAPI = {
  getDashboardStats: async () => api.get("/doctor/dashboard"),
  joinOrganization: async (data: { hospital_id: number; specialization: string; license_number: string }) =>
    api.post("/doctor/join", data),
  getPatients: async () => api.get("/doctor/patients"),
  getPatientDetails: async (id: number) => api.get(`/doctor/patients/${id}`),
  addMedicalRecord: async (id: number, data: { diagnosis: string; prescription: string; notes: string }) =>
    api.post(`/doctor/patients/${id}/records`, data),
  
  // Inventory
  getInventory: async () => api.get("/doctor/inventory"),
  addInventoryItem: async (data: { name: string; quantity: number; unit: string; threshold: number }) => 
    api.post("/doctor/inventory", data),
  updateStock: async (id: number, quantity: number) => api.put(`/doctor/inventory/${id}`, { quantity }),
  uploadInventory: async (formData: FormData) => 
    api.post("/doctor/inventory/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }),

  // Schedule & Appointments
  getSchedule: async () => api.get("/doctor/schedule"),
  blockSlot: async (data: { date: string; time?: string; reason: string; is_whole_day: boolean }) => 
    api.post("/doctor/schedule/block", data),
  
  // Treatment Management
  getTreatments: async () => api.get("/doctor/treatments"),
  createTreatment: async (data: { name: string; cost: number; description?: string }) => 
    api.post("/doctor/treatments", data),
  linkInventory: async (treatmentId: number, data: { item_id: number; quantity: number }) => 
    api.post(`/doctor/treatments/${treatmentId}/link-inventory`, data),

  completeAppointment: async (id: number) => api.post(`/doctor/appointments/${id}/complete`),

  getFinance: async () => api.get("/doctor/finance"),

  // NEW: Agent Chat
  chatWithAgent: async (data: { agent_type: string; user_query: string; role: string }) =>
    api.post("/agent/router", data),

  getAiInsights: async () => Promise.resolve({ data: [] }), 
};

export const PatientAPI = {
  getDoctors: async () => api.get("/doctors"),
  bookAppointment: async (data: { doctor_id: number; date: string; time: string; reason: string }) => 
    api.post("/appointments", data),
  getMyAppointments: async () => api.get("/patient/appointments"),
  cancelAppointment: async (id: number) => api.put(`/patient/appointments/${id}/cancel`),
  getMyRecords: async () => api.get("/patient/records"),
};

export default api;