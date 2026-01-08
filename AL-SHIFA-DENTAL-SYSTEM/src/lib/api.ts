import axios from "axios";

const API_URL = "http://localhost:8000"; 

export const api = axios.create({ 
  baseURL: API_URL, 
  headers: { "Content-Type": "application/json" } 
});

// Request Interceptor for JWT
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- AUTHENTICATION API ---
export const AuthAPI = {
  login: (username: string, password: string) => { 
    // Uses URLSearchParams for x-www-form-urlencoded compliance (OAuth2 style)
    const d = new URLSearchParams(); 
    d.append("username", username); 
    d.append("password", password); 
    return api.post("/auth/login", d, { 
      headers: { "Content-Type": "application/x-www-form-urlencoded" } 
    }); 
  },
  register: (data: any) => api.post("/auth/register", data),
  verifyOtp: (data: any) => api.post("/auth/verify-otp", data),
  getMe: () => api.get("/auth/me"),
  getVerifiedHospitals: () => api.get("/auth/hospitals"),
};

// --- DOCTOR API ---
export const DoctorAPI = {
  // Dashboard
  getDashboardStats: () => api.get("/doctor/dashboard"),

  // Inventory Management
  getInventory: () => api.get("/doctor/inventory"),
  addInventoryItem: (data: any) => api.post("/doctor/inventory", data),
  
  // MERGED LOGIC: This was in your second block, required for InventoryPage
  updateStock: (id: number, quantity: number) => api.put(`/doctor/inventory/${id}`, { quantity }),
  
  uploadInventory: (formData: FormData) => 
    api.post("/doctor/inventory/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }),

  // Treatment Management
  getTreatments: () => api.get("/doctor/treatments"),
  createTreatment: (data: any) => api.post("/doctor/treatments", data),
  
  // MERGED LOGIC: Required for TreatmentsPage
  linkInventory: (treatmentId: number, data: any) => api.post(`/doctor/treatments/${treatmentId}/link-inventory`, data),
  
  uploadTreatments: (formData: FormData) => 
    api.post("/doctor/treatments/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }),

  // Schedule & Appointments
  getSchedule: () => api.get("/doctor/schedule"),
  startAppointment: (id: number) => api.post(`/doctor/appointments/${id}/start`), 
  completeAppointment: (id: number) => api.post(`/doctor/appointments/${id}/complete`),

  // Patient Management
  getPatients: () => api.get("/doctor/patients"),
  getPatientDetails: (id: number) => api.get(`/doctor/patients/${id}`),
  addMedicalRecord: (id: number, data: any) => api.post(`/doctor/patients/${id}/records`, data),
  uploadPatientFile: (id: number, formData: FormData) => 
      api.post(`/doctor/patients/${id}/files`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),

  // Financials
  getFinance: () => api.get("/doctor/finance"),
};

// --- PATIENT API ---
export const PatientAPI = {
  getDoctors: () => api.get("/doctors"),
  getDoctorTreatments: (doctorId: number) => api.get(`/doctors/${doctorId}/treatments`),
  bookAppointment: (data: any) => api.post("/appointments", data),
  getMyAppointments: () => api.get("/patient/appointments"),
  cancelAppointment: (id: number) => api.put(`/patient/appointments/${id}/cancel`),
  getMyRecords: () => api.get("/patient/records"),
  getMyInvoices: () => api.get("/patient/invoices"),
  getInvoiceDetail: (id: number) => api.get(`/patient/invoices/${id}`),
};

// --- ADMIN API ---
export const AdminAPI = {
  getDoctors: () => api.get("/admin/doctors"),
  getOrganizations: () => api.get("/admin/organizations"),
  approveAccount: (id: number, type: string) => api.post(`/admin/approve-account/${id}?type=${type}`),
  deleteEntity: (id: number, type: string) => api.delete(`/admin/delete/${type}/${id}`),
};

// --- ORGANIZATION API ---
export const OrganizationAPI = {
  getStats: () => api.get("/organization/stats"),
  getDoctors: () => api.get("/organization/doctors"),
};