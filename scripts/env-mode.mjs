const MODES = {
  dev: { name: "dev", backend: "development", vite: "development" },
  development: { name: "dev", backend: "development", vite: "development" },
  test: { name: "test", backend: "test", vite: "test" },
  prod: { name: "prod", backend: "production", vite: "prod" },
  production: { name: "prod", backend: "production", vite: "prod" },
};

export function parseEnvironmentArgs(argv = process.argv.slice(2)) {
  const args = argv.filter((argument) => argument !== "--");
  let requested = "dev";
  const envEquals = args.find((argument) => argument.startsWith("--env="));
  const envIndex = args.indexOf("--env");
  const plainEnvIndex = args.indexOf("env");

  if (envEquals) requested = envEquals.slice("--env=".length);
  else if (envIndex >= 0) requested = args[envIndex + 1];
  else if (plainEnvIndex >= 0) requested = args[plainEnvIndex + 1];
  else if (args[0]) requested = args[0];

  const mode = MODES[String(requested || "").toLowerCase()];
  if (!mode) throw new Error("Environment must be dev, test, or prod.");
  return mode;
}
