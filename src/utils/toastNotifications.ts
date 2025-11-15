import toast from "react-hot-toast";

const toastStyle = {
  background: "#000000",
  color: "#DA9C2F",
  border: "2px solid #DA9C2F",
  borderRadius: "8px",
  fontWeight: "500",
};

export const notifySuccess = (message: string, duration = 3000) => {
  toast.success(message, {
    duration,
    style: toastStyle,
  });
};

export const notifyError = (message: string, duration = 4000) => {
  toast.error(message, {
    duration,
    style: toastStyle,
  });
};

export const notifyInfo = (message: string, duration = 3000) => {
  toast(message, {
    duration,
    style: toastStyle,
  });
};

export const notifyLoading = (message: string) => {
  return toast.loading(message, {
    style: toastStyle,
  });
};

export const notifyWalletAction = (action: string) => {
  notifyInfo(`${action}...`);
};

export const notifyDiscordAction = (action: string) => {
  notifyInfo(`${action}...`);
};
