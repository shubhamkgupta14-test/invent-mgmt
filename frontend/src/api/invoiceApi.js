import API from "./apiClient";

export const getInvoices = async (params = {}) => {
  return API.get("/invoices/", { params });
};

export const createInvoice = async (payload) => {
  return API.post("/invoices/create", payload);
};

export const getInvoice = async (invoiceRecordId) => {
  return API.get(`/invoices/${invoiceRecordId}`);
};
