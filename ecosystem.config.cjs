module.exports = {
  apps: [
    {
      name: "ai-traker",
      cwd: "/home/ubuntu/ai-tracker",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
        PORT: "3000",
      },
      autorestart: true,
      max_restarts: 10,
      time: true,
    },
  ],
};
