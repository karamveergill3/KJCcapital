import next from "eslint-config-next";

export default [
  ...next.configs["core-web-vitals"],
  {
    rules: {
      "react/no-unescaped-entities": "off"
    }
  }
];
