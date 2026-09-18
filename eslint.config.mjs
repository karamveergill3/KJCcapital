// eslint-config-next ships flat config: the package and its subpaths each
// export the array directly. The old `next.configs["core-web-vitals"]` shape
// belonged to eslintrc and read as undefined here, which crashed every run.
import coreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  { ignores: [".next/**", "node_modules/**", "public/**"] },
  ...coreWebVitals,
  {
    rules: {
      "react/no-unescaped-entities": "off"
    }
  }
];

export default config;
