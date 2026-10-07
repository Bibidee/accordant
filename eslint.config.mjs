import { globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [globalIgnores([".direct-mode-packages/**", ".direct-mode-latest/**", ".next/**", "artifacts/**"]), ...nextVitals, ...nextTypescript];
export default config;
