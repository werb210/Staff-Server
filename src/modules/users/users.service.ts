import { type UsersStatusResponse } from "./users.types";

export function getUsersStatus(): UsersStatusResponse {
  return { status: "ok" };
}
