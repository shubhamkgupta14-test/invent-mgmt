import API from "./apiClient";

export const getMail = async (params = {}) => {
  return API.get("/mailer/", { params });
};

export const sendMail = async (payload) => {
  return API.post("/mailer/send", payload);
};

export const getMailSignature = async () => {
  return API.get("/mailer/signature");
};

export const markMailRead = async (messageId) => {
  return API.patch(`/mailer/${messageId}/read`);
};

export const updateMailStar = async (messageId, starred) => {
  return API.patch(`/mailer/${messageId}/star`, { starred });
};

export const deleteMail = async (messageId) => {
  return API.delete(`/mailer/${messageId}`);
};

export const bulkDeleteMail = async (messageIds) => {
  return API.delete("/mailer/bulk", { data: { message_ids: messageIds } });
};
