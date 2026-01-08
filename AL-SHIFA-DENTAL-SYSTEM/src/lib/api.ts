import axios from "axios";

const API_URL = "http://localhost:8000"; 

export const api = axios.create({ baseURL: API_URL, headers: { "Content-Type": "application/json" } });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AuthAPI = {
  login: (e: string, p: string) => { 
    const d = new URLSearchParams(); 
    d.append("username", e); 
    d.append("password", p); 
    return api.post("/auth/login", d, { headers: { "Content-Type": "application/x-www-form-urlencoded" } }); 
  },
  register: (d: any) => api.post("/auth/register", d),
  verifyOtp: (d: any) => api.post("/auth/verify-otp", d),
  getMe: () => api.get("/auth/me"),
  getVerifiedHospitals: () => api.get("/auth/hospitals"),
};

export const DoctorAPI = {
  getDashboardStats: () => api.get("/doctor/dashboard"),
  getInventory: () => api.get("/doctor/inventory"),
  addInventoryItem: (d: any) => api.post("/doctor/inventory", d),
  updateStock: (id: number, quantity: number) => api.put(`/doctor/inventory/${id}`, { quantity }),
  uploadInventory: (d: FormData) => api.post("/doctor/inventory/upload", d, { headers: { "Content-Type": "multipart/form-data" } }),
  getTreatments: () => api.get("/doctor/treatments"),
  createTreatment: (d: any) => api.post("/doctor/treatments", d),
  linkInventory: (tid: number, d: any) => api.post(`/doctor/treatments/${tid}/link-inventory`, d),
  uploadTreatments: (d: FormData) => api.post("/doctor/treatments/upload", d, { headers: { "Content-Type": "multipart/form-data" } }),
  getSchedule: () => api.get("/doctor/schedule"),
  getAppointments: (date: string) => api.get(`/doctor/appointments?date=${date}`),
  blockSlot: (d: any) => api.post("/doctor/schedule/block", d),
  startAppointment: (id: number) => api.post(`/doctor/appointments/${id}/start`), 
  completeAppointment: (id: number) => api.post(`/doctor/appointments/${id}/complete`),
  getPatients: () => api.get("/doctor/patients"),
  getPatientDetails: (id: number) => api.get(`/doctor/patients/${id}`),
  addMedicalRecord: (id: number, d: any) => api.post(`/doctor/patients/${id}/records`, d),
  uploadPatientFile: (id: number, d: FormData) => api.post(`/doctor/patients/${id}/files`, d, { headers: { "Content-Type": "multipart/form-data" } }),
  getFinance: () => api.get("/doctor/finance"),
};

export const PatientAPI = {
  getDoctors: () => api.get("/doctors"),
  getDoctorTreatments: (did: number) => api.get(`/doctors/${did}/treatments`),
  bookAppointment: (d: any) => api.post("/appointments", d),
  getMyAppointments: () => api.get("/patient/appointments"),
  cancelAppointment: (id: number) => api.put(`/patient/appointments/${id}/cancel`),
  getMyRecords: () => api.get("/patient/records"),
  getMyInvoices: () => api.get("/patient/invoices"),
  getInvoiceDetail: (id: number) => api.get(`/patient/invoices/${id}`),
};

export const AdminAPI = {
  getDoctors: () => api.get("/admin/doctors"),
  getOrganizations: () => api.get("/admin/organizations"),
  getPatients: () => api.get("/admin/patients"),
  approveAccount: (id: number, type: string) => api.post(`/admin/approve-account/${id}?type=${type}`),
  deleteEntity: (id: number, type: string) => api.delete(`/admin/delete/${type}/${id}`),
};

export const OrganizationAPI = {
  getStats: () => api.get("/organization/stats"),
  getDoctors: () => api.get("/organization/doctors"),
  verifyDoctor: (id: number) => api.post(`/organization/doctors/${id}/verify`),
  removeDoctor: (id: number) => api.delete(`/organization/doctors/${id}`),
};