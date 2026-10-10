export interface AuthPermission {
  module: string;
  menu: string;
  action: string;
}

export interface AuthNavigationMenu {
  id: number;
  parentId: number | null;
  code: string;
  name: string;
  route: string | null;
  icon: string | null;
  sortOrder: number;
  actions: string[];
}

export interface AuthNavigationModule {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  menus: AuthNavigationMenu[];
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
  navigation: AuthNavigationModule[];
}

export interface JwtPayload {
  sub: number;
  username: string;
}
