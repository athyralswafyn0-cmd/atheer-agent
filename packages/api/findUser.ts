import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } })
  console.log('User:', user)
  if (user) {
    const org = await prisma.organization.findUnique({ where: { id: user.organizationId } })
    console.log('Organization:', org)
  }
}
main().catch(e => console.error(e))
