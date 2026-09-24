import { apiRequest } from "../../lib/api/client";
import type { Framing } from "../../lib/framing";

export interface User {
  id: number;
  username: string;
  displayName: string;
  avatarAssetId?: number | null;
  avatarFraming?: Framing | null;
  companion?: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export function login(username: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: { username, password },
    auth: false,
  });
}

export function fetchMe(): Promise<User> {
  return apiRequest<User>("/api/auth/me");
}
