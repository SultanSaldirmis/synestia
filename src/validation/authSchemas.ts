import * as Yup from 'yup';

export const loginSchema = Yup.object({
  email: Yup.string()
    .required('E-posta adresi zorunludur')
    .email('Geçerli bir e-posta adresi giriniz'),
  password: Yup.string()
    .required('Şifre zorunludur')
    .min(6, 'Şifre en az 6 karakter olmalıdır'),
});

export type LoginFormValues = Yup.InferType<typeof loginSchema>;

export const registerSchema = Yup.object({
  displayName: Yup.string()
    .required('Ad soyad zorunludur')
    .min(2, 'Ad en az 2 karakter olmalıdır'),
  email: Yup.string()
    .required('E-posta adresi zorunludur')
    .email('Geçerli bir e-posta adresi giriniz'),
  password: Yup.string()
    .required('Şifre zorunludur')
    .min(6, 'Şifre en az 6 karakter olmalıdır'),
  passwordConfirm: Yup.string()
    .required('Şifre onayı zorunludur')
    .oneOf([Yup.ref('password')], 'Şifreler eşleşmiyor'),
});

export type RegisterFormValues = Yup.InferType<typeof registerSchema>;
