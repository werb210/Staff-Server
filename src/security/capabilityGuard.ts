const MAYA_ROLE_CAPABILITIES: Record<string, readonly string[]> = {
  admin: ["ml_predict"],
  broker: ["ml_predict"],
  marketing: [],
  executive: [],
  intake: [],
};

export function requireCapability(role: string | undefined, capability: string): void {
  if (!role) {
    throw new Error(`Role is required for capability: ${capability}`);
  }

  const capabilities = MAYA_ROLE_CAPABILITIES[role] ?? [];
  if (!capabilities.includes(capability)) {
    throw new Error(`Capability '${capability}' is not permitted for role '${role}'.`);
  }
}
