export interface SalaryBreakdown {
  baseSalary: number
  totalWorkingDays: number
  presentDays: number
  halfDays: number
  paidLeaveDays: number
  unpaidLeaveDays: number
  absentDays: number
  effectivePresentDays: number
  deductionAmount: number
  netSalary: number
}

export function calculateSalary(
  baseSalary: number,
  attendance: { status: string; date: Date }[],
  month: number,
  year: number
): SalaryBreakdown {
  // Count total working days (exclude Sundays only)
  const daysInMonth = new Date(year, month, 0).getDate()
  let totalWorkingDays = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay()
    if (day !== 0) totalWorkingDays++ // 0 = Sunday
  }

  // Guard against division by zero
  if (totalWorkingDays === 0) {
    return {
      baseSalary,
      totalWorkingDays: 0,
      presentDays: 0,
      halfDays: 0,
      paidLeaveDays: 0,
      unpaidLeaveDays: 0,
      absentDays: 0,
      effectivePresentDays: 0,
      deductionAmount: 0,
      netSalary: 0,
    }
  }

  let presentDays = 0
  let halfDays = 0
  let paidLeaveDays = 0
  let unpaidLeaveDays = 0
  let absentDays = 0

  for (const record of attendance) {
    switch (record.status) {
      case "PRESENT":     presentDays++;     break
      case "HALF_DAY":    halfDays++;        break
      case "PAID_LEAVE":  paidLeaveDays++;   break
      case "UNPAID_LEAVE": unpaidLeaveDays++; break
      case "ABSENT":      absentDays++;      break
    }
  }

  // Days accounted for in attendance records
  const markedDays = presentDays + halfDays + paidLeaveDays +
    unpaidLeaveDays + absentDays

  // Days with NO attendance record = treat as absent
  // This prevents getting full salary with zero attendance marked
  const unmarkedDays = Math.max(0, totalWorkingDays - markedDays)
  const effectiveAbsentDays = absentDays + unmarkedDays

  const perDaySalary = baseSalary / totalWorkingDays

  // Deductible days:
  // - Absent (including unmarked days)
  // - Unpaid leave
  // - Half days count as 0.5 deduction
  const deductibleDays =
    effectiveAbsentDays +
    unpaidLeaveDays +
    (halfDays * 0.5)

  // Effective days worked (for reference)
  const effectivePresentDays =
    presentDays +
    paidLeaveDays +
    (halfDays * 0.5)

  const deductionAmount = parseFloat(
    (perDaySalary * deductibleDays).toFixed(2)
  )

  // Net salary cannot go below 0
  const netSalary = parseFloat(
    Math.max(0, baseSalary - deductionAmount).toFixed(2)
  )

  return {
    baseSalary,
    totalWorkingDays,
    presentDays,
    halfDays,
    paidLeaveDays,
    unpaidLeaveDays,
    absentDays: effectiveAbsentDays, // includes unmarked
    effectivePresentDays,
    deductionAmount,
    netSalary,
  }
}
