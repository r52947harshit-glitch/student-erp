export const CLASS_LIST = [
  'Nursery', 'KG', '1', '2', '3', '4', '5', '6', '7', '8'
];

export const SUBJECT_LIST = [
  'Hindi',
  'English', 
  'Mathematics',
  'Science',
  'Social Science',
  'Computer',
  'Sanskrit',
  'Physical Education',
  'Art',
  'GK',
];

export const QUALIFICATION_LIST = [
  'B.Ed',
  'M.Ed',
  'B.A + B.Ed',
  'M.A + B.Ed',
  'B.Sc + B.Ed',
  'M.Sc + B.Ed',
  'D.El.Ed',
  'Other',
];

// Academic year helpers
export function getCurrentAcademicYear(): string {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const year = now.getFullYear()
  // Academic year starts April (month 4)
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(2)}`
  }
  return `${year - 1}-${String(year).slice(2)}`
}

// e.g. input "2024-25" → output "2025-26"
export function getNextAcademicYear(current: string): string {
  const startYear = parseInt(current.split("-")[0])
  const nextStart = startYear + 1
  const nextEnd = nextStart + 1
  return `${nextStart}-${String(nextEnd).slice(2)}`
}

// Class promotion map
// Nursery → KG → 1 → 2 → ... → 8 → GRADUATED
export const CLASS_PROMOTION_MAP: Record<string, string | null> = {
  "Nursery": "KG",
  "KG":      "1",
  "1":       "2",
  "2":       "3",
  "3":       "4",
  "4":       "5",
  "5":       "6",
  "6":       "7",
  "7":       "8",
  "8":       null, // null means graduated
}

// Generate admission number
export function generateAdmissionNo(
  year: string,
  sequence: number
): string {
  const startYear = year.split("-")[0]
  const seq = String(sequence).padStart(3, "0")
  return `STU-${startYear}-${seq}`
}

// Generate roll number for academic year
export function generateRollNo(
  className: string,
  year: string,
  sequence: number
): string {
  const startYear = year.split("-")[0]
  const seq = String(sequence).padStart(3, "0")
  return `${className}-${startYear}-${seq}`
}
