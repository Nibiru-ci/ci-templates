module.exports = [
  {
    files: ["**/*.js"],
    languageOptions: { sourceType: "commonjs", globals: { console: "readonly", module: "writable" } },
    rules: { "no-unused-vars": "error", "no-undef": "error" },
  },
];