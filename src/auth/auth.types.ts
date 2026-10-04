export interface AuthPermission {
  module: string;
  menu: string;
  action: string;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: {
    id: number;
    code: string;
    name: string;
  };
  permissions: AuthPermission[];
}

export interface JwtPayload {
  sub: number;
  username: string;
}
