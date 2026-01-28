export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^(\+?234|0)[789]\d{9}$/;
  return re.test(phone.replace(/\s+/g, ''));
};

export const validatePassword = (password) => {
  return password.length >= 6;
};