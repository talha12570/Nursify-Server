const { z } = require("zod");

const signup = z.object({
  fullName: z
    .string({ required_error: "Full name is required" })
    .trim()
    .min(3, { message: "Full name must be at least 3 characters long" })
    .max(50, { message: "Full name must be at most 50 characters long" }),

  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email({ message: "Invalid email format" }),

  password: z
    .string({ required_error: "Password is required" })
    .trim()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(20, { message: "Password must be at most 20 characters long" }),

  phone: z
    .string()
    .optional(),

  userType: z
    .enum(['patient', 'nurse', 'caretaker'])
    .optional()
    .default('patient'),

  cnicNumber: z
    .string()
    .optional(),

  cnicFront: z
    .string()
    .optional(),

  cnicBack: z
    .string()
    .optional(),

  specialty: z
    .string()
    .optional(),

  licenseNumber: z
    .string()
    .optional(),

  licensePhoto: z
    .string()
    .optional(),

  experienceLetter: z
    .string()
    .optional(),

  experienceImage: z
    .string()
    .optional(),

  professionalImage: z
    .string()
    .optional(),

  medicalRecord: z
    .string()
    .optional(),
});

const Login = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email({ message: "Invalid email format" }),

  password: z
    .string({ required_error: "Password is required" })
    .trim()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(20, { message: "Password must be at most 20 characters long" }),
});

module.exports = { signup, Login };
