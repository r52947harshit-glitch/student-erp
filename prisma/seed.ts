import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('Admin@1234', 10)
  console.log(hashedPassword)
  const teacherPassword = await bcrypt.hash('Teacher@1234', 10)

  // Seed Admin
  const adminEntry = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {},
    create: {
      email: 'admin@school.com',
      name: 'System Admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })
  
  // Seed Teacher
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@school.com' },
    update: {},
    create: {
      email: 'teacher@school.com',
      name: 'Jane Doe',
      password: teacherPassword,
      role: 'TEACHER',
    },
  })

  await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      userId: teacherUser.id,
      employeeId: "TCH-001",
      phone: "9876543210",
      address: "123 School Lane",
      qualification: "M.Sc B.Ed",
      joiningDate: new Date(),
      assignedClasses: {
        create: [
          { className: "Nursery", subjects: ["All"] },
          { className: "1", subjects: ["Math", "English"] },
          { className: "5", subjects: ["Science"] }
        ]
      }
    }
  })

  // Seed Notice
  await prisma.notice.create({
    data: {
      title: "Welcome to Teacher Portal",
      body: "This is a global notice for teachers.",
      category: "General",
      targetRole: "TEACHER",
      postedBy: adminEntry.id
    }
  })

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
