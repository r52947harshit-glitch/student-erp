import { prisma } from "@/lib/prisma"
import logger from "@/lib/logger"

interface CreateNotificationInput {
  userId: string
  type: string
  title: string
  body: string
  link?: string
  metadata?: any
}

// Create a single notification
export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type as any,
        title: input.title,
        body: input.body,
        link: input.link,
        metadata: input.metadata,
      },
    })
  } catch (error) {
    // Never let notification failure crash the main action
    logger.error("Failed to create notification:", error)
  }
}

// Create notifications for multiple users at once
export async function createBulkNotifications(
  inputs: CreateNotificationInput[]
): Promise<void> {
  try {
    await prisma.notification.createMany({
      data: inputs.map((n) => ({
        userId: n.userId,
        type: n.type as any,
        title: n.title,
        body: n.body,
        link: n.link,
        metadata: n.metadata,
      })),
      skipDuplicates: false,
    })
  } catch (error) {
    logger.error("Failed to create bulk notifications:", error)
  }
}

// ─── TYPED NOTIFICATION CREATORS ─────────────

// Called when teacher posts an assignment
export async function notifyAssignmentPosted(
  assignment: {
    id: string
    title: string
    className: string
    subject: string
    dueDate: Date
  },
  studentIds: string[] // userIds of students in that class
): Promise<void> {
  const inputs = studentIds.map((userId) => ({
    userId,
    type: "ASSIGNMENT_POSTED",
    title: "New Assignment Posted",
    body: `${assignment.subject}: "${assignment.title}" — Due ${
      new Date(assignment.dueDate).toLocaleDateString("en-IN", {
        day: "numeric", month: "short"
      })
    }`,
    link: "/student/assignments",
    metadata: { assignmentId: assignment.id },
  }))
  await createBulkNotifications(inputs)
}

// Called when admin marks student absent
export async function notifyAttendanceAbsent(
  studentUserId: string,
  date: Date,
  className: string
): Promise<void> {
  await createNotification({
    userId: studentUserId,
    type: "ATTENDANCE_ABSENT",
    title: "Attendance: Marked Absent",
    body: `You were marked absent on ${
      date.toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "short"
      })
    } for ${className}.`,
    link: "/student/attendance",
    metadata: { date: date.toISOString() },
  })
}

// Called when teacher publishes results
export async function notifyResultPublished(
  studentUserIds: string[],
  examType: string,
  className: string
): Promise<void> {
  const examLabels: Record<string, string> = {
    UNIT_TEST:   "Unit Test",
    HALF_YEARLY: "Half Yearly",
    ANNUAL:      "Annual Exam",
  }
  const inputs = studentUserIds.map((userId) => ({
    userId,
    type: "RESULT_PUBLISHED",
    title: "Results Published",
    body: `${examLabels[examType] || examType} results for ${
      className
    } are now available.`,
    link: "/student/results",
    metadata: { examType },
  })).filter(input => input.userId !== undefined && input.userId !== null)
  await createBulkNotifications(inputs)
}

// Called when admin posts a notice
export async function notifyNoticePublished(
  notice: { id: string; title: string; targetRole: string },
  userIds: string[]
): Promise<void> {
  const inputs = userIds.map((userId) => ({
    userId,
    type: "NOTICE_PUBLISHED",
    title: "New Notice",
    body: notice.title,
    link: "/student/notice",
    metadata: { noticeId: notice.id },
  }))
  await createBulkNotifications(inputs)
}

// Called when admin processes salary payment
export async function notifySalaryProcessed(
  teacherUserId: string,
  netSalary: number,
  month: string,
  year: number
): Promise<void> {
  await createNotification({
    userId: teacherUserId,
    type: "SALARY_PROCESSED",
    title: "Salary Credited",
    body: `Your salary of ₹${netSalary.toLocaleString(
      "en-IN"
    )} for ${month} ${year} has been processed.`,
    link: "/teacher/profile",
    metadata: { amount: netSalary, month, year },
  })
}

// Called by a daily cron / on page load for fee reminders
export async function notifyFeeDueReminder(
  studentUserId: string,
  feeType: string,
  amount: number,
  dueDate: Date
): Promise<void> {
  const daysLeft = Math.ceil(
    (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  await createNotification({
    userId: studentUserId,
    type: "FEE_DUE_REMINDER",
    title: "Fee Payment Reminder",
    body: `${feeType} fee of ₹${amount.toLocaleString(
      "en-IN"
    )} is due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`,
    link: "/student/fee",
    metadata: { amount, dueDate: dueDate.toISOString() },
  })
}

// Called when admin promotes student to next year
export async function notifyYearPromoted(
  studentUserId: string,
  fromClass: string,
  toClass: string | null,
  newYear: string
): Promise<void> {
  const isGraduated = toClass === null
  await createNotification({
    userId: studentUserId,
    type: "YEAR_PROMOTED",
    title: isGraduated ? "Congratulations! 🎓" : "Promoted to Next Class",
    body: isGraduated
      ? `You have successfully completed Class 8 and graduated!`
      : `You have been promoted from ${
          fromClass === "Nursery" || fromClass === "KG"
            ? fromClass
            : `Class ${fromClass}`
        } to ${
          toClass === "Nursery" || toClass === "KG"
            ? toClass
            : `Class ${toClass}`
        } for the academic year ${newYear}.`,
    link: "/student/dashboard",
    metadata: { fromClass, toClass, year: newYear },
  })
}
