import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Result_2 = {
    __kind__: "ok";
    ok: PublicUser;
} | {
    __kind__: "err";
    err: string;
};
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Result_6 = {
    __kind__: "ok";
    ok: Array<LOARequest>;
} | {
    __kind__: "err";
    err: string;
};
export type Result_5 = {
    __kind__: "ok";
    ok: Array<PunishmentLog>;
} | {
    __kind__: "err";
    err: string;
};
export interface PublicUser {
    id: UserId;
    username: string;
    createdAt: bigint;
    role: Role;
}
export type Result_1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export interface http_header {
    value: string;
    name: string;
}
export type Result_4 = {
    __kind__: "ok";
    ok: Array<PublicUser>;
} | {
    __kind__: "err";
    err: string;
};
export type UserId = bigint;
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Result = {
    __kind__: "ok";
    ok: bigint;
} | {
    __kind__: "err";
    err: string;
};
export type Result_3 = {
    __kind__: "ok";
    ok: WebhookConfig;
} | {
    __kind__: "err";
    err: string;
};
export interface PunishmentLog {
    id: bigint;
    ign: string;
    rnd: string;
    offenseNumber: bigint;
    submittedBy: string;
    timestamp: bigint;
    proof: string;
}
export interface WebhookConfig {
    loaWebhookUrl: string;
    punishmentWebhookUrl: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export type Result_7 = {
    __kind__: "ok";
    ok: UserId;
} | {
    __kind__: "err";
    err: string;
};
export interface LOARequest {
    id: bigint;
    ign: string;
    active: boolean;
    submittedBy: string;
    timestamp: bigint;
    discordUsername: string;
    leaveDate: string;
    returnDate: string;
}
export interface UserProfile {
    ign: string;
    username: string;
    role: Role;
    discordUsername: string;
}
export enum Role {
    CoOwner = "CoOwner",
    StaffBuilder = "StaffBuilder",
    Owner = "Owner"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface DiscordSessionData {
    token: string;
    discordId: string;
    username: string;
    avatar: string;
    role: string;
    createdAt: bigint;
}
export type Result_8 = {
    __kind__: "ok";
    ok: DiscordSessionData;
} | {
    __kind__: "err";
    err: string;
};
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    changePassword(oldPassword: string, newPassword: string): Promise<Result_1>;
    createStaffAccount(userPrincipal: Principal, username: string, passwordHash: string, role: Role): Promise<Result_7>;
    deactivateLOA(loaId: bigint): Promise<Result_1>;
    discordCallback(code: string, redirectUri: string): Promise<Result_8>;
    discordLogout(token: string): Promise<void>;
    dummyTransform(input: TransformationInput): Promise<TransformationOutput>;
    getActiveLOACount(): Promise<bigint>;
    getAllLOARequests(): Promise<Result_6>;
    getAllPunishmentLogs(): Promise<Result_5>;
    getAllUsers(): Promise<Result_4>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCurrentUser(): Promise<Result_2>;
    getDiscordSession(token: string): Promise<DiscordSessionData | null>;
    getPunishmentLogCount(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWebhookConfig(): Promise<Result_3>;
    initializeBackend(didSeed: string): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    login(username: string, password: string): Promise<Result_2>;
    logout(): Promise<Result_1>;
    promoteUser(userPrincipal: Principal, newRole: Role): Promise<Result_1>;
    removeStaffAccount(userPrincipal: Principal): Promise<Result_1>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setWebhookConfig(punishmentUrl: string, loaUrl: string): Promise<Result_1>;
    submitLOARequest(ign: string, discordUsername: string, leaveDate: string, returnDate: string): Promise<Result>;
    submitPunishmentLog(ign: string, rnd: string, offenseNumber: bigint, proof: string): Promise<Result>;
}
