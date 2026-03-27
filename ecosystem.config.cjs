/** PM2 config — run from repo root: `pm2 start ecosystem.config.cjs && pm2 save` */
module.exports = {
  apps: [
    {
      name: "bumbleupon",
      cwd: __dirname,
      script: "npm",
      args: "start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PORT: "3003",
      },
    },
  ],
};
