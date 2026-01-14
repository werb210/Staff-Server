export type ApiRoute = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  roles: Array<"Admin" | "Staff" | "Lender" | "Referrer">;
};

export const ROUTES: ApiRoute[] = [
  { method: "GET", path: "/api/auth/me", roles: ["Admin", "Staff", "Lender", "Referrer"] },
  { method: "GET", path: "/api/applications", roles: ["Admin", "Staff"] },
  { method: "GET", path: "/api/crm/contacts", roles: ["Admin", "Staff"] },
  { method: "GET", path: "/api/communications", roles: ["Admin", "Staff"] },
  { method: "GET", path: "/api/calendar/events", roles: ["Admin", "Staff"] },
  { method: "GET", path: "/api/marketing", roles: ["Admin", "Staff"] },
  { method: "GET", path: "/api/lenders", roles: ["Admin"] },
  { method: "GET", path: "/api/settings/me", roles: ["Admin", "Staff"] },
];
