// White Rabbit version information
export const WHITE_RABBIT_VERSION = "0.2.0";

// Mock vLLM version for compatibility
export const VLLM_VERSION = "0.6.3.post1";

// Build information
export const BUILD_INFO = {
  name: "white-rabbit",
  description: "Deno vLLM emulator providing mock OpenAI-compatible API endpoints",
  version: WHITE_RABBIT_VERSION,
  vllm_version: VLLM_VERSION,
  deno_version: Deno.version.deno,
  typescript_version: Deno.version.typescript,
  v8_version: Deno.version.v8,
  built_at: new Date().toISOString(),
};

export interface VersionInfo {
  version: string;
  white_rabbit_version: string;
  build_info?: {
    name: string;
    description: string;
    version: string;
    vllm_version: string;
    deno_version: string;
    typescript_version: string;
    v8_version: string;
    built_at: string;
  };
}

export function getVersionInfo(includeDetails = false): VersionInfo {
  const info: VersionInfo = {
    version: VLLM_VERSION,
    white_rabbit_version: WHITE_RABBIT_VERSION,
  };

  if (includeDetails) {
    info.build_info = BUILD_INFO;
  }

  return info;
}
