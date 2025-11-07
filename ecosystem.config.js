module.exports = {
  apps: [{
    name: 'gamble-babd',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/gamble.babd', // Update this path to your actual deployment directory
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
