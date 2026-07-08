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

export const cancelInvoice = async (invoiceRecordId, reason) => {
  return API.post(`/invoices/${invoiceRecordId}/cancel`, { reason });
};

export const sendInvoiceEmail = async (invoiceRecordId) => {
  return API.post(`/invoices/${invoiceRecordId}/send-email`);
};

export const sendBulkInvoiceEmails = async (invoiceRecordIds) => {
  return API.post("/invoices/send-email/bulk", {
    invoice_record_ids: invoiceRecordIds,
  });
};
