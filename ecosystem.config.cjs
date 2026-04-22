module.exports = {
  apps: [
    {
      name: "ai-tracker",
      cwd: "/home/ubuntu/ai-tracker",
      script: "start-server.js",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: "500M",
      time: true,
      error_file: "/home/ubuntu/.pm2/logs/ai-tracker-error.log",
      out_file: "/home/ubuntu/.pm2/logs/ai-tracker-out.log",
    },
  ],
};
