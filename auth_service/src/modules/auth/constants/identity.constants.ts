export const IDENTITY_SELECT = {
  id: true,
  email: true,
  phoneNumber: true,
  roles: true,
  status: true,
  passwordCredential: { select: { passwordHash: true } },
} as const;
