import next from "eslint-config-next";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [...next, ...nextTypescript];

export default eslintConfig;
