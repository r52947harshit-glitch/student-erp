import { z } from "zod"

export const studentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  class: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required").max(10),
  dob: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid Date of Birth" }),
  parentName: z.string().min(2, "Parent name must be at least 2 characters").max(100),
  contact: z.string().min(10, "Contact must be exactly 10 digits").max(10), // Simplistic assumption
  address: z.string().min(5, "Address must be at least 5 characters").max(255),
  photoUrl: z.string().url().optional()
})

export const feeStructureSchema = z.object({
  class: z.string().min(1, "Class is required"),
  type: z.string().min(2, "Fee type is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  dueDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid Due Date" })
})

export const noticeSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(150),
  body: z.string().min(10, "Content must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  targetRole: z.enum(["ALL", "STUDENT", "TEACHER"]),
  scheduledAt: z.string().optional()
})

export const attendanceSchema = z.object({
  date: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid Date" }),
  attendanceList: z.array(z.object({
    studentId: z.string().min(1),
    status: z.enum(["PRESENT", "ABSENT", "LEAVE"])
  })).min(1, "Attendance list cannot be empty")
})

export const resultBulkSchema = z.array(z.object({
  studentId: z.string().min(1),
  subject: z.string().min(2),
  examType: z.enum(["UNIT_TEST", "HALF_YEARLY", "ANNUAL"]),
  marksObtained: z.number().min(0, "Marks cannot be negative"),
  totalMarks: z.number().positive("Total marks must be greater than zero"),
  editReason: z.string().optional()
})).min(1, "Results payload cannot be empty")

export const paymentSchema = z.object({
  amount: z.number().positive("Payment amount must be greater than zero"),
  type: z.string().min(2, "Fee type is required")
})

export const addTeacherSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string()
    .regex(/^[6-9]\d{9}$/, "Enter valid 10-digit Indian mobile number"),
  address: z.string().min(5, "Address too short").max(300),
  qualification: z.string().min(2),
  joiningDate: z.string().refine((d) => !isNaN(Date.parse(d)), {
    message: "Invalid joining date",
  }),
  assignedClasses: z.array(
    z.object({
      className: z.string().min(1, "Class name is required"),
      subjects: z.array(z.string().min(1)).min(1, "Select at least one subject per class"),
    })
  ).min(1, "Assign at least one class to the teacher"),
})

export const updateTeacherSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string()
    .regex(/^[6-9]\d{9}$/, "Enter valid 10-digit Indian mobile number")
    .optional(),
  address: z.string().min(5).max(300).optional(),
  qualification: z.string().min(2).optional(),
  assignedClasses: z.array(
    z.object({
      className: z.string(),
      subjects: z.array(z.string()).min(1),
    })
  ).optional(),
})

export const teacherSelfUpdateSchema = z.object({
  phone: z.string()
    .regex(/^[6-9]\d{9}$/, "Enter valid 10-digit Indian mobile number")
    .optional(),
  address: z.string().min(5).max(300).optional(),
  qualification: z.string().min(2).optional(),
})
