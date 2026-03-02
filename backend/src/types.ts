import { Role } from "@prisma/client";

export type AuthUser = {
  id: string;
  role: Role;
  email: string;
  name?: string | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
