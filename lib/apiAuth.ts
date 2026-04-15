import { NextResponse } from "next/server"
import { getAuthSession } from "./auth"
import { checkRateLimit } from "./rateLimit"

export async function validateSession(allowedRoles: string[]) {
  const session = await getAuthSession()

  if (!session || !session.user) {
    return {
      errorResponse: NextResponse.json(
        { error: "Unauthorized. Please login." },
        { status: 401 }
      ),
      session: null,
    }
  }

  if (!allowedRoles.includes(session.user.role)) {
    return {
      errorResponse: NextResponse.json(
        { error: "Forbidden. Insufficient permissions." },
        { status: 403 }
      ),
      session: null,
    }
  }

  const rl = checkRateLimit(session.user.id, {
    limit: 60,
    windowMs: 60000,
  })
  if (!rl.success) {
    return {
      errorResponse: NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      ),
      session: null,
    }
  }

  return { errorResponse: null, session }
}
